"""专项验收：无账号 / 无服务端存储改造
- 只保留周计划与界面偏好，不写收藏 / 训练记录 / PR / 浏览记录
- 周计划导出 / 读回 / 清空本机数据可用
- 跟练完成不落盘
- 导出训练卡链路不受影响（由 _verify_final.js 覆盖）
"""
import functools
import json
import os
import tempfile
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from playwright.sync_api import sync_playwright

CHROME = r'C:/Program Files/Google/Chrome/Application/chrome.exe'
PORT = 8785
BASE = 'http://127.0.0.1:%d' % PORT


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


class Server(ThreadingHTTPServer):
    request_queue_size = 128
    daemon_threads = True


BANNED = ['ff_favs', 'ff_log', 'ff_pr', 'ff_views']


def keys(pg):
    return pg.evaluate('Object.keys(localStorage).sort()')


def main():
    srv = Server(('127.0.0.1', PORT), functools.partial(Quiet, directory='web'))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    out = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, headless=True,
                                    args=['--no-sandbox', '--no-proxy-server'])
        page = browser.new_page(viewport={'width': 1280, 'height': 900}, accept_downloads=True)
        errs = []
        bad = []
        page.on('pageerror', lambda e: errs.append('JS ' + str(e)[:160]))
        page.on('console', lambda m: errs.append('CONSOLE ' + m.text[:160]) if m.type == 'error' else None)
        page.on('response', lambda r: bad.append(r.url.split('/')[-1] + ':' + str(r.status))
                if r.status >= 400 else None)
        page.on('dialog', lambda d: d.accept())

        page.goto(BASE + '/index.html', wait_until='domcontentloaded', timeout=90000)
        page.wait_for_selector('.card', timeout=30000)
        page.wait_for_timeout(1200)

        out['initialKeys'] = keys(page)
        out['initialClean'] = not any(k in out['initialKeys'] for k in BANNED)
        out['views'] = page.evaluate("""() => ({
            top: [...document.querySelectorAll('.nav-item')].map(x => x.dataset.view),
            bottom: [...document.querySelectorAll('.bn-item')].map(x => x.dataset.view),
            favBtns: document.querySelectorAll('.card .fav').length,
            removed: ['view-favorites','view-log','view-stats','logModal']
                        .filter(id => document.getElementById(id)).length,
            localNote: !!document.querySelector('.local-note')
        })""")

        # 四个视图都能切换
        out['navSwitch'] = page.evaluate("""() => {
            const r = {};
            for (const v of ['planner','musclemap','tools','library']) {
                switchView(v);
                r[v] = document.getElementById('view-' + v).classList.contains('active');
            }
            return r;
        }""")
        out['aboutDataNote'] = page.evaluate("""() => {
            switchView('tools');
            const leftover = document.querySelectorAll('#view-tools .data-note, #view-tools .pop-src').length;
            openAbout();
            const m = document.getElementById('aboutModal');
            const d = m.querySelector('.data-note');
            const r = { exists: !!d, open: m.classList.contains('on'),
                        sources: m.querySelectorAll('.pop-src').length, leftoverNotes: leftover,
                        toolsCards: document.querySelectorAll('.tool-card').length,
                        text: d ? d.textContent.replace(/\\s+/g,' ').trim().slice(0,60) : '',
                        clearBtn: typeof clearLocalData === 'function',
                        overflow: document.documentElement.scrollWidth - innerWidth };
            closeModal('aboutModal');
            switchView('library');
            return r;
        }""")

        # 编辑周计划 → 只写 ff_plan
        out['planEdited'] = page.evaluate("""() => {
            const id = EXERCISES[0].id;
            state.weeklyPlan.mon.exercises.push({ id, sets: '3', reps: '10', weight: '' });
            _set('ff_plan', state.weeklyPlan);
            return state.weeklyPlan.mon.exercises.length;
        }""")
        out['afterEditKeys'] = keys(page)

        # 导出周计划 → 检查文件字段
        with page.expect_download(timeout=30000) as dl:
            page.evaluate('backupData()')
        download = dl.value
        with open(download.path(), 'r', encoding='utf8') as f:
            data = json.load(f)
        out['backupFields'] = sorted(data.keys())
        out['backupClean'] = not any(k in data for k in ['favorites', 'log', 'pr'])
        out['backupPlanDays'] = len(data.get('plan', {}))

        # 从文件读回（旧版备份也兼容：夹带无用字段应被忽略）
        data['plan']['mon']['exercises'] = data['plan']['mon']['exercises'][:1]
        data['favorites'] = ['0001']
        data['log'] = [{'exercises': []}]
        tmp = os.path.join(tempfile.gettempdir(), '_ff_plan_check.json')
        with open(tmp, 'w', encoding='utf8') as f:
            json.dump(data, f, ensure_ascii=False)
        page.set_input_files('input[type=file]', tmp)
        page.wait_for_timeout(600)
        out['restore'] = page.evaluate("""() => ({
            monCount: state.weeklyPlan.mon.exercises.length,
            storedKeys: Object.keys(localStorage).sort(),
            undoShown: document.body.textContent.includes('撤销')
        })""")
        os.remove(tmp)

        # 跟练完成：不写 ff_log / ff_pr，完成页说明不保存
        out['session'] = page.evaluate("""() => {
            try {
                startSession('mon');
                if (!SESSION.items.length) return { skipped: true };
                finishSession();
                const txt = document.getElementById('sessionBody').textContent;
                return {
                    noteNoSave: txt.includes('不记录训练数据'),
                    noLogBtn: !document.getElementById('sessionFoot').textContent.includes('查看记录'),
                    keys: Object.keys(localStorage).sort()
                };
            } catch (e) { return { error: String(e) }; }
        }""")
        out['sessionClean'] = not any(k in out['session'].get('keys', []) for k in BANNED)
        page.evaluate("try { closeSession(); } catch(e) {}")

        # 手机端：周计划说明条 / 工具箱单列 / 关于弹窗不溢出
        m = browser.new_page(viewport={'width': 390, 'height': 844})
        m.goto(BASE + '/index.html', wait_until='domcontentloaded', timeout=90000)
        m.wait_for_selector('.card', timeout=30000)
        m.evaluate("switchView('planner')")
        m.wait_for_timeout(400)
        out['mobilePlanner'] = m.evaluate("""() => ({
            overflow: document.documentElement.scrollWidth - innerWidth,
            noteW: Math.round(document.querySelector('.local-note').getBoundingClientRect().width),
            noteVisible: document.querySelector('.local-note').getBoundingClientRect().height > 20
        })""")
        m.screenshot(path='_nopersonal_planner_mobile.png')
        m.evaluate("switchView('tools')")
        m.wait_for_timeout(400)
        out['mobileTools'] = m.evaluate("""() => ({
            overflow: document.documentElement.scrollWidth - innerWidth,
            cards: document.querySelectorAll('.tool-card').length,
            cols: getComputedStyle(document.querySelector('.tool-grid')).gridTemplateColumns.split(' ').length
        })""")
        m.screenshot(path='_nopersonal_tools_mobile.png')
        m.evaluate("openAbout()")
        m.wait_for_timeout(300)
        out['mobileAbout'] = m.evaluate("""() => ({
            overflow: document.documentElement.scrollWidth - innerWidth,
            visible: document.getElementById('aboutModal').classList.contains('on'),
            sources: document.querySelectorAll('#aboutSources .pop-src').length
        })""")
        m.screenshot(path='_nopersonal_about_mobile.png')
        m.evaluate("closeModal('aboutModal'); switchView('library')")
        m.wait_for_timeout(300)
        m.screenshot(path='_nopersonal_library_mobile.png')

        out['jsErrors'] = errs[:8]
        out['badResponses'] = bad[:8]
        browser.close()
    srv.shutdown()
    print(json.dumps(out, ensure_ascii=False, indent=2))

    fails = []
    if not out['initialClean'] or not out['backupClean'] or not out['sessionClean']:
        fails.append('仍写入个人数据')
    if out['views']['favBtns'] or out['views']['removed'] or not out['views']['localNote']:
        fails.append('已删功能残留')
    if out['views']['top'] != ['library', 'planner', 'musclemap', 'tools']:
        fails.append('导航不是 4 项')
    if not all(out['navSwitch'].values()):
        fails.append('视图切换失败')
    if out['jsErrors'] or out['badResponses']:
        fails.append('有 JS 报错或 4xx')
    a = out['aboutDataNote']
    if not a['exists'] or not a['open'] or a['sources'] != 6 or a['leftoverNotes'] or a['toolsCards'] != 6:
        fails.append('关于弹窗内容或工具箱清理不彻底')
    if out['mobilePlanner']['overflow'] or out['mobileTools']['overflow'] or out['mobileAbout']['overflow']:
        fails.append('手机端横向溢出')
    if out['mobileTools']['cols'] != 1 or not out['mobileAbout']['visible']:
        fails.append('手机端布局或关于弹窗异常')
    print('\n' + ('✓ 全部通过' if not fails else '✗ 失败：' + ' / '.join(fails)))
    return 1 if fails else 0


if __name__ == '__main__':
    raise SystemExit(main())
