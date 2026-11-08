# -*- coding: utf-8 -*-
"""首次使用路径验收：三步引导是真入口、卡片「+」直接加计划、详情主按钮、导出空状态引导。

自带 HTTP 服务，桌面 1440 + 手机 390 真实视口，不依赖外部进程。
"""
import functools
import json
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright

CHROME = r'C:/Program Files/Google/Chrome/Application/chrome.exe'
PORT = 8777


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


class Server(ThreadingHTTPServer):
    request_queue_size = 128
    daemon_threads = True


_srv = Server(('127.0.0.1', PORT), functools.partial(QuietHandler, directory='web'))
threading.Thread(target=_srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:%d/index.html' % PORT

out, fails = {}, []


def check(name, cond, detail=''):
    out[name] = {'pass': bool(cond), 'detail': detail}
    if not cond:
        fails.append(name + ((' · ' + str(detail)) if detail else ''))


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME, headless=True,
                                args=['--no-sandbox', '--no-proxy-server'])

    # ── 桌面：完整走一遍新用户路径 ──
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    errs, bad = [], []
    page.on('pageerror', lambda e: errs.append(str(e)[:160]))
    page.on('console', lambda m: errs.append('CONSOLE ' + m.text[:160]) if m.type == 'error' else None)
    page.on('response', lambda r: bad.append(str(r.status) + ' ' + r.url[-60:]) if r.status >= 400 else None)
    page.goto(URL, wait_until='domcontentloaded', timeout=90000)
    page.wait_for_selector('.card', timeout=30000)
    page.wait_for_timeout(900)

    out['firstScreen'] = page.evaluate("""() => {
      const bar = document.getElementById('welcomeBar');
      const b = bar.getBoundingClientRect();
      return {
        guideVisible: !bar.hidden,
        guideHeight: Math.round(b.height),
        steps: [...bar.querySelectorAll('.sb-step')].map(x => x.textContent.trim()),
        addBtns: document.querySelectorAll('.card .card-add').length,
        cardCount: document.querySelectorAll('.card').length,
        addRect: (() => { const r = document.querySelector('.card .card-add').getBoundingClientRect();
          return [Math.round(r.left), Math.round(r.top), Math.round(r.width)]; })(),
        overflow: document.documentElement.scrollWidth - innerWidth
      };
    }""")
    fs = out['firstScreen']
    check('guideVisible', fs['guideVisible'])
    check('guideCompact', fs['guideHeight'] <= 56, fs['guideHeight'])
    check('threeSteps', len(fs['steps']) == 3 and '导出图片' in fs['steps'][2], fs['steps'])
    check('cardAddButtons', fs['addBtns'] == fs['cardCount'] and fs['addBtns'] > 0,
          '%d/%d' % (fs['addBtns'], fs['cardCount']))
    check('desktopOverflow', fs['overflow'] == 0, fs['overflow'])
    page.screenshot(path='_ux_after_desktop.png')

    # 第 1 步：关条 + 目标脉冲，不弹说明
    page.evaluate('guideStep(1)')
    page.wait_for_timeout(200)
    out['step1'] = page.evaluate("""() => ({
      hidden: document.getElementById('welcomeBar').hidden,
      pulsed: !!document.querySelector('.card-add.ff-pulse'),
      remembered: localStorage.getItem('ff_welcomed') === '1'
    })""")
    check('step1Pulse', out['step1']['hidden'] and out['step1']['pulsed'], out['step1'])
    check('step1NotRemembered', not out['step1']['remembered'])

    # 卡片「+」→ 选哪天（搜索框应隐藏）→ 加入 → toast 带跳转
    page.locator('.card .card-add').first.click()
    page.wait_for_timeout(250)
    out['dayPicker'] = page.evaluate("""() => ({
      open: document.getElementById('pickerModal').classList.contains('on'),
      title: document.getElementById('pickerTitle').textContent.trim(),
      searchHidden: getComputedStyle(document.querySelector('#pickerModal .search')).display === 'none',
      days: document.querySelectorAll('#pickerList .pick').length
    })""")
    dp = out['dayPicker']
    check('dayPickerOpen', dp['open'] and dp['days'] == 7, dp)
    check('dayPickerNoDeadSearch', dp['searchHidden'], dp)
    page.screenshot(path='_ux_after_daypicker.png')

    before = page.evaluate("state.weeklyPlan.mon.exercises.length")
    page.locator('#pickerList .pick').first.click()
    page.wait_for_timeout(300)
    out['afterAdd'] = page.evaluate("""() => ({
      count: state.weeklyPlan.mon.exercises.length,
      toast: (document.querySelector('.toast') || {}).textContent || '',
      jump: !!document.querySelector('.toast-act'),
      modalClosed: !document.getElementById('pickerModal').classList.contains('on')
    })""")
    aa = out['afterAdd']
    check('addWorks', aa['count'] == before + 1 and aa['modalClosed'], aa)
    check('addFeedback', '已加入周一' in aa['toast'] and aa['jump'], aa['toast'])
    page.locator('.toast-act').click()
    page.wait_for_timeout(200)
    check('jumpToPlanner', page.evaluate("state.view") == 'planner')

    # 详情弹窗：主按钮在最左
    page.evaluate("switchView('library');showDetail(EXERCISES[0].id)")
    page.wait_for_timeout(200)
    out['detailActions'] = page.evaluate(
        "[...document.querySelectorAll('#detailActions button')].map(b=>b.textContent.trim())")
    check('detailPrimaryFirst', out['detailActions'][0].startswith('加入周计划'), out['detailActions'])
    check('detailNoDuplicate', len([x for x in out['detailActions'] if '跟练这个动作' in x]) == 1,
          out['detailActions'])
    page.evaluate("closeModal('detailModal')")

    # 第 2 步 → 周计划 + 模板条脉冲；第 3 步 → 直接打开导出面板
    page.evaluate("document.getElementById('welcomeBar').hidden=false;guideStep(2)")
    page.wait_for_timeout(200)
    out['step2'] = page.evaluate("""() => ({
      view: state.view, pulsed: !!document.querySelector('.tpl-fold.ff-pulse')
    })""")
    check('step2Planner', out['step2']['view'] == 'planner' and out['step2']['pulsed'], out['step2'])
    page.evaluate("document.getElementById('welcomeBar').hidden=false;guideStep(3)")
    page.wait_for_timeout(1200)
    out['step3'] = page.evaluate("""() => ({
      open: document.getElementById('exportModal').classList.contains('on'),
      preview: (document.getElementById('exportPreview').textContent || '').trim().slice(0, 40),
      remembered: localStorage.getItem('ff_welcomed') === '1'
    })""")
    check('step3Export', out['step3']['open'] and len(out['step3']['preview']) > 0, out['step3'])
    check('step3Remembered', out['step3']['remembered'])
    page.evaluate("closeModal('exportModal')")

    # 顶栏训练卡：今天是休息日时自动给整周成品，不让人对着空白
    page.evaluate("openExport('today')")
    page.wait_for_timeout(500)
    out['todayCard'] = page.evaluate("""() => ({
      range: exportState.range,
      empty: !!document.querySelector('.export-empty')
    })""")
    check('todayCardFallback', out['todayCard']['range'] == 'all' and not out['todayCard']['empty'],
          out['todayCard'])
    page.evaluate("closeModal('exportModal')")

    # 导出空状态 → 一键去选模板
    page.evaluate("""() => { clearPlan(); openExport('all'); }""")
    page.wait_for_timeout(500)
    out['exportEmpty'] = page.evaluate("""() => ({
      text: (document.querySelector('.export-empty') || {}).textContent || '',
      hasBtn: !!document.querySelector('.export-empty button')
    })""")
    check('exportEmptyAction', out['exportEmpty']['hasBtn'], out['exportEmpty']['text'][:60])
    if out['exportEmpty']['hasBtn']:
        page.locator('.export-empty button').click()
        page.wait_for_timeout(300)
        out['exportEmptyJump'] = page.evaluate("""() => ({
          view: state.view, tplOpen: !!document.querySelector('.tpl-lib.open'),
          exportClosed: !document.getElementById('exportModal').classList.contains('on')
        })""")
        check('exportEmptyJumpWorks', out['exportEmptyJump']['view'] == 'planner'
              and out['exportEmptyJump']['tplOpen'] and out['exportEmptyJump']['exportClosed'],
              out['exportEmptyJump'])

    out['desktopErrors'] = errs[:8]
    out['badResponses'] = bad[:8]
    check('noJsErrors', not errs, errs[:3])
    check('noBadResponses', not bad, bad[:3])
    page.close()

    # ── 手机：引导条不抢首屏，卡片「+」常驻 ──
    m = browser.new_page(viewport={'width': 390, 'height': 844})
    merrs = []
    m.on('pageerror', lambda e: merrs.append(str(e)[:160]))
    m.goto(URL, wait_until='domcontentloaded', timeout=90000)
    m.wait_for_selector('.card', timeout=30000)
    m.wait_for_timeout(900)
    out['mobile'] = m.evaluate("""() => {
      const bar = document.getElementById('welcomeBar');
      const add = document.querySelector('.card-add');
      const r = add.getBoundingClientRect();
      return {
        guideHeight: Math.round(bar.getBoundingClientRect().height),
        stepsVisible: [...bar.querySelectorAll('.sb-step')].every(b => b.getBoundingClientRect().width > 0),
        addVisible: getComputedStyle(add).opacity === '1' && r.width >= 34,
        overflow: document.documentElement.scrollWidth - innerWidth,
        cardTop: Math.round(document.querySelector('.card').getBoundingClientRect().top),
        errs: 0
      };
    }""")
    mo = out['mobile']
    check('mobileGuideCompact', mo['guideHeight'] <= 90, mo['guideHeight'])
    check('mobileStepsVisible', mo['stepsVisible'])
    check('mobileAddVisible', mo['addVisible'], mo)
    check('mobileOverflow', mo['overflow'] == 0, mo['overflow'])
    m.screenshot(path='_ux_after_mobile.png')
    # 手机点「+」也能开选天弹窗且不溢出
    m.locator('.card .card-add').first.click()
    m.wait_for_timeout(250)
    check('mobileAddWorks', m.evaluate("document.getElementById('pickerModal').classList.contains('on')"))
    out['mobileErrors'] = merrs[:5]
    check('mobileNoErrors', not merrs, merrs[:3])
    m.close()
    browser.close()

_srv.shutdown()
print('\n===== 首次使用路径验收 =====')
print(json.dumps(out, ensure_ascii=False, indent=2))
print('\n===== %s =====' % ('PASS 全部通过' if not fails else 'FAIL ' + ' | '.join(fails)))
