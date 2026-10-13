/* 吉时知日 · 行动助理 —— 演示版（原生 JS，与主仓库 engine.ts 逻辑一致） */
(function () {
  'use strict'

  /* ---------- 数据加载 ---------- */
  async function loadDays() {
    const bin = Uint8Array.from(atob(ALMANAC_B64), (c) => c.charCodeAt(0))
    const stream = new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'))
    return JSON.parse(await new Response(stream).text())
  }

  /* ---------- 行动引擎（移植自 engine.ts） ---------- */
  const ACTIONS = [
    { id: 'sign', name: '签约交易', icon: '✍️', keywords: ['交易', '开市', '纳财', '立券'], big: true,
      tipYi: '财星临门，适合落笔签字、收付款项', tipJi: '今日不宜定约，条款容易生变', tipPing: '无明确宜忌，常规商务照常推进' },
    { id: 'open', name: '开业开市', icon: '🏪', keywords: ['开市', '竖旗挂匾', '开仓'], big: true,
      tipYi: '开门见财，适合开张、上线、发布', tipJi: '今日不宜开张，开业另择吉日', tipPing: '可正常营业，剪彩仪式另择日' },
    { id: 'marry', name: '婚嫁喜事', icon: '💍', keywords: ['结婚', '嫁娶', '纳采', '订婚', '合帐'], big: true,
      tipYi: '喜事天成，适合嫁娶、订婚、见家长', tipJi: '今日不宜婚嫁，喜事改期更圆满', tipPing: '可约会相聚，大礼另择日' },
    { id: 'move', name: '搬家入宅', icon: '🏠', keywords: ['入宅', '移徙', '安门', '安床'], big: true,
      tipYi: '乔迁得地，适合搬家、入伙、安床', tipJi: '今日不宜迁移，搬家另择日', tipPing: '可收拾整理，正式入宅另择日' },
    { id: 'travel', name: '出行差旅', icon: '🧳', keywords: ['出行', '上官赴任'], big: false,
      tipYi: '路路通达，适合启程、出差、赴任', tipJi: '今日不宜远行，行程可缓一日', tipPing: '短途通勤照常，长途稳中求' },
    { id: 'build', name: '动土装修', icon: '🔨', keywords: ['动土', '修造', '竖柱', '起工', '盖屋', '破土', '架马', '定磉'], big: true,
      tipYi: '土木兴旺，适合开工、装修、维修', tipJi: '今日不宜动土，工程暂缓', tipPing: '小修小补可做，大动另择日' },
    { id: 'health', name: '求医疗养', icon: '🌿', keywords: ['求医', '治病', '疗病'], big: false,
      tipYi: '宜治病求医，拖着的小毛病去看看', tipJi: '今日不宜探病问疾，调理以静养为主', tipPing: '常规体检复诊照常' },
    { id: 'clean', name: '清扫断舍离', icon: '🧹', keywords: ['解除', '扫舍', '破屋坏垣', '剃头', '平治道涂', '修饰垣墙', '沐浴'], big: false,
      tipYi: '宜除旧布新，清理杂物、化解心结', tipJi: '今日不宜大拆大清，维持现状即可', tipPing: '日常打扫照常' },
    { id: 'pray', name: '祭祀祈福', icon: '🙏', keywords: ['祭祀', '祈福', '建醮', '开光', '安香'], big: false,
      tipYi: '心诚则灵，适合上香、祭祖、许愿', tipJi: '今日不宜祈福许愿，静心即是修行', tipPing: '心怀敬意，日常即可' },
    { id: 'career', name: '求职入学', icon: '📈', keywords: ['上官赴任', '入学', '求名'], big: false,
      tipYi: '前程有望，适合面试、入职、开学', tipJi: '今日不宜履新，入职报到可商改期', tipPing: '投递简历、准备功课照常' },
  ]
  const HEIDAO = ['天刑', '朱雀', '白虎', '天牢', '玄武', '勾陈']
  const GOOD_LUCK = ['吉', '贵', '合', '禄', '进']
  const BAD_LUCK = ['凶', '破']
  const WARN_LUCK = ['退', '空']
  const BRANCH_ZODIAC = { 子: '鼠', 丑: '牛', 寅: '虎', 卯: '兔', 辰: '龙', 巳: '蛇', 午: '马', 未: '羊', 申: '猴', 酉: '鸡', 戌: '狗', 亥: '猪' }
  const HOUR_CLOCK = [['23:00', '01:00'], ['01:00', '03:00'], ['03:00', '05:00'], ['05:00', '07:00'], ['07:00', '09:00'], ['09:00', '11:00'], ['11:00', '13:00'], ['13:00', '15:00'], ['15:00', '17:00'], ['17:00', '19:00'], ['19:00', '21:00'], ['21:00', '23:00']]
  const ZODIACS = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']

  const hourZodiac = (h) => BRANCH_ZODIAC[h.gz.charAt(1)] || ''
  const isGoodHour = (h) => GOOD_LUCK.includes(h.luck)
  const hourState = (h) => GOOD_LUCK.includes(h.luck) ? 'good' : BAD_LUCK.includes(h.luck) ? 'bad' : WARN_LUCK.includes(h.luck) ? 'warn' : 'mid'
  const isHeidao = (d) => HEIDAO.includes(d.zhishen)
  const hasXiong = (d, names) => names.some((n) => d.xiongshen.includes(n))

  function goodWindows(day) {
    const goodIdx = day.hours.map((h, i) => ({ h, i })).filter(({ h }) => isGoodHour(h) && hourZodiac(h) !== day.chong).map(({ i }) => i)
    const ranges = []
    let start = -1
    for (let k = 0; k <= goodIdx.length; k++) {
      const cur = k < goodIdx.length ? goodIdx[k] : -99
      if (start === -1) { if (cur >= 0) start = cur; continue }
      if (cur !== goodIdx[k - 1] + 1) {
        ranges.push(HOUR_CLOCK[start][0] + '–' + HOUR_CLOCK[goodIdx[k - 1]][1])
        start = cur >= 0 ? cur : -1
      }
    }
    return ranges
  }

  function advise(day) {
    const windows = goodWindows(day)
    const heidao = isHeidao(day)
    const poDay = day.jianchu === '破日'
    const yanggong = hasXiong(day, ['杨公忌'])
    const yuepo = hasXiong(day, ['月破'])
    return ACTIONS.map((action) => {
      const inYi = action.keywords.some((k) => day.yi.includes(k))
      const inJi = action.keywords.some((k) => day.ji.includes(k))
      let level = inYi ? 'yi' : inJi ? 'ji' : 'ping'
      let note = inYi ? action.tipYi : inJi ? action.tipJi : action.tipPing
      if (action.big && level === 'yi' && (poDay || yanggong || yuepo)) {
        level = 'ping'
        note += '；但逢' + (yanggong ? '杨公忌' : poDay ? '破日' : '月破') + '，大事从容些更稳'
      }
      if (action.big && level === 'yi' && heidao) note += '；黑道值日，按规矩办、不冒险'
      return { action, level, note, windows: level === 'ji' ? [] : windows }
    })
  }

  const levelLabel = (l) => l === 'yi' ? '宜行动' : l === 'ji' ? '宜避开' : '可为'

  /* ---------- 待办理解 + 挑时段 ---------- */
  const TASK_KEYWORDS = [
    ['sign', ['签约', '合同', '签字', '签单', '付款', '收款', '回款', '交易', '谈判', '定金']],
    ['open', ['开业', '开张', '开店', '上线', '发布会', '开市', '剪彩', '挂牌']],
    ['marry', ['结婚', '婚礼', '嫁娶', '订婚', '领证', '提亲', '相亲', '婚宴']],
    ['move', ['搬家', '乔迁', '入宅', '安床', '搬迁', '搬公司']],
    ['travel', ['出差', '旅行', '旅游', '出行', '启程', '远行', '赶飞机', '赶火车']],
    ['build', ['装修', '动土', '开工', '施工', '盖房', '维修', '破土', '翻新']],
    ['health', ['看病', '体检', '复诊', '求医', '手术', '治疗', '理疗', '拔牙']],
    ['clean', ['打扫', '清理', '断舍离', '理发', '剃头', '沐浴', '大扫除', '洗车']],
    ['pray', ['祈福', '拜佛', '上香', '祭祖', '许愿', '开光', '还愿']],
    ['career', ['面试', '入职', '求职', '考试', '开学', '报到', '跳槽', '答辩']],
  ]

  function parseTask(text) {
    for (const [id, words] of TASK_KEYWORDS) {
      const hit = words.find((w) => text.includes(w))
      if (hit) {
        const action = ACTIONS.find((a) => a.id === id)
        if (action) return { action, matched: hit }
      }
    }
    return { action: null, matched: '' }
  }

  function generalSlot(day) {
    const windows = goodWindows(day)
    const bad = day.jianchu === '破日' || hasXiong(day, ['杨公忌', '月破'])
    const goodJian = ['开日', '成日', '定日', '满日', '执日'].includes(day.jianchu)
    const level = bad ? 'ji' : goodJian && !isHeidao(day) ? 'yi' : 'ping'
    const note = bad
      ? '逢' + (hasXiong(day, ['杨公忌']) ? '杨公忌' : day.jianchu === '破日' ? '破日' : '月破') + '，诸事缓一缓'
      : level === 'yi'
        ? day.jianchu + '当值、' + day.zhishen + '值日，整日气场顺，适合安排要事'
        : day.jianchu + '、' + day.zhishen + '值日，平常可为，不必赶大动作'
    return { date: day.date, weekday: day.weekday, lunar: day.lunar, level, note, windows: level === 'ji' ? [] : windows }
  }

  function suggestSlots(days, parsed, fromDate, count) {
    const slots = days.filter((d) => d.date >= fromDate).map((day) => {
      if (parsed.action) {
        const adv = advise(day).find((a) => a.action.id === parsed.action.id)
        return { date: day.date, weekday: day.weekday, lunar: day.lunar, level: adv.level, note: adv.note, windows: adv.windows }
      }
      return generalSlot(day)
    })
    const rank = (l) => (l === 'yi' ? 0 : l === 'ping' ? 1 : 2)
    return slots.filter((s) => s.level !== 'ji')
      .sort((a, b) => rank(a.level) - rank(b.level) || a.date.localeCompare(b.date))
      .slice(0, count || 3)
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  /* ---------- 提醒 ---------- */
  const REM_KEY = 'jszr-reminders'
  const loadReminders = () => { try { return JSON.parse(localStorage.getItem(REM_KEY) || '[]') } catch (e) { return [] } }
  const saveReminders = (l) => localStorage.setItem(REM_KEY, JSON.stringify(l))
  const windowStart = (date, w) => date + 'T' + w.slice(0, 5)
  const pad = (n) => String(n).padStart(2, '0')
  function nowStr() { const t = new Date(); return t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate()) + 'T' + pad(t.getHours()) + ':' + pad(t.getMinutes()) }
  function todayLocal() { return nowStr().slice(0, 10) }

  /* ---------- 应用状态 ---------- */
  let days = null
  let tab = 'daily'
  let date = todayLocal()
  let zodiac = localStorage.getItem('jszr-zodiac') || ''
  let calAction = 'sign'
  let advisorOpen = false
  let advisorState = { text: '', parsed: null, slots: [], justSet: [] }
  let toast = null

  const $ = (sel) => document.querySelector(sel)
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

  function currentDay() {
    const clamped = date < days[0].date ? days[0].date : date > days[days.length - 1].date ? days[days.length - 1].date : date
    return days.find((d) => d.date === clamped) || days[0]
  }

  /* ---------- 视图 ---------- */
  function dailyHTML() {
    const day = currentDay()
    const advices = advise(day)
    const order = { yi: 0, ping: 1, ji: 2 }
    advices.sort((a, b) => order[a.level] - order[b.level])
    const chongMe = zodiac && day.chong === zodiac
    const jieqi = (day.jieqi || []).join(' · ')
    return `
      <div class="card">
        <div class="dayhead">
          <div>
            <div class="date">${day.date} · ${day.weekday}</div>
            <div class="lunar">农历${day.lunar}${jieqi ? ' · ' + esc(jieqi) : ''}</div>
            <div class="ganzhi">${day.year.ganzhi}年 ${day.month.ganzhi}月 ${day.day.ganzhi}日 · 纳音${day.day.nayin}</div>
          </div>
          <div class="day-nav">
            <button data-nav="-1">← 前一天</button>
            <input type="date" value="${day.date}" min="${days[0].date}" max="${days[days.length - 1].date}" id="datepick">
            <button data-nav="1">后一天 →</button>
          </div>
        </div>
        <div class="chips">
          <span class="chip">${day.jianchu}</span>
          <span class="chip">${day.zhishen}值日${isHeidao(day) ? '（黑道）' : '（黄道）'}</span>
          <span class="chip">星宿 ${day.xiu}</span>
          <span class="chip red">冲${day.chong} · 煞${(day.extras && day.extras.sha) || ''}</span>
        </div>
        ${chongMe ? `<div class="chong-banner">⚠️ 今日冲「${day.chong}」，与您的属相相冲——大事求稳，重要决定可缓一缓。</div>` : ''}
        <div class="hours">${day.hours.map((h) => `<div class="h ${hourState(h)}" title="${h.name} ${h.span} ${h.luck}">${h.gz.charAt(1)}<br>${h.luck}</div>`).join('')}</div>
        <div class="small muted" style="margin-top:8px">十二时辰一览：绿吉 · 红凶 · 黄退空 · 灰平。胎神占方：${esc(day.taishen)}</div>
      </div>
      <div class="grid">
        ${advices.map((a) => `
          <div class="action">
            <div class="top"><span class="name">${a.action.icon} ${a.action.name}</span><span class="badge ${a.level}">${levelLabel(a.level)}</span></div>
            <div class="note">${a.note}</div>
            ${a.windows.length ? `<div class="wins">${a.windows.map((w) => `<span class="win">⏰ ${w}</span>`).join('')}</div>` : ''}
          </div>`).join('')}
      </div>`
  }

  function calendarHTML() {
    const action = ACTIONS.find((a) => a.id === calAction)
    const today = todayLocal()
    return `
      <div class="card">
        <div class="cal-head">
          <h2>按「事」看日子</h2>
          <select id="calaction">${ACTIONS.map((a) => `<option value="${a.id}" ${a.id === calAction ? 'selected' : ''}>${a.icon} ${a.name}</option>`).join('')}</select>
          <span class="small muted">点任意一天看详情</span>
        </div>
        <div class="cal-grid">
          ${days.map((d) => {
            const adv = advise(d).find((a) => a.action.id === action.id)
            return `<div class="cal-cell cal-${adv.level}${d.date === today ? ' today' : ''}" data-date="${d.date}" title="${d.date} ${d.weekday} ${levelLabel(adv.level)}">
              <span class="d">${Number(d.date.slice(8))}</span><span>${d.date.slice(5, 7)}月</span>
            </div>`
          }).join('')}
        </div>
        <div class="legend">
          <span><span class="dot" style="background:#E4F0E6"></span>宜行动</span>
          <span><span class="dot" style="background:#F3ECDA"></span>可为</span>
          <span><span class="dot" style="background:#F7E3E3"></span>宜避开</span>
        </div>
      </div>`
  }

  function profileHTML() {
    return `
      <div class="card">
        <h2>我的日课</h2>
        <p class="small muted" style="margin-top:4px">填上您的属相，「今日行动」会自动标出与您相冲的日子。</p>
        <div class="zgrid">${ZODIACS.map((z) => `<button class="${z === zodiac ? 'sel' : ''}" data-zodiac="${z}">${z}</button>`).join('')}</div>
        ${zodiac ? `<p class="small" style="margin-top:12px;color:#1E6B3C">已记住：您属「${zodiac}」。逢冲${zodiac}的日子，首页会有醒目提示。</p>` : ''}
      </div>
      <div class="pro">
        <div class="tag">JI SHI ZHI RI · PRO</div>
        <h3>从一份报告，到持续陪伴</h3>
        <p>免费版告诉您「今天怎么样」；订阅版替您「把日子排好」——日课不再是一篇读完就算的文章，而是长在您日历里的行动助理。</p>
        <ul>
          <li>命盘行动日历：变动宜何时、守成宜何月，未来 90 天逐日推送</li>
          <li>吉时到点提醒：签约、开会、开工前，把最佳窗口推到您手上</li>
          <li>大事择日代办：婚期、开业、乔迁，给出三个候选吉日并说明理由</li>
          <li>家人命盘合参：全家人的冲煞提醒，一次订阅全家受用</li>
        </ul>
        <div class="price"><div><b>¥12 / 月</b><div class="small" style="color:#F0E6CF">或 ¥98 / 年 · 随时退订</div></div><button class="btn" style="background:#E8C96A;color:#7A1414">开通陪伴</button></div>
        <p class="fine">* 产品形态演示：付费通道尚未接入。本服务基于传统择日体系整理，仅供民俗文化参考。</p>
      </div>`
  }

  function advisorHTML() {
    if (!advisorOpen) return ''
    const st = advisorState
    const pending = loadReminders().filter((r) => !r.fired).sort((a, b) => a.when.localeCompare(b.when))
    const examples = ['后天和客户签合同', '下个月搬家', '周五面试', '挑个日子开业']
    return `
      <div class="mask" id="advmask">
        <div class="dialog">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <h2>有事？帮您挑个好时间</h2>
            <button id="advclose" style="font-size:20px;color:#8A7B5C">×</button>
          </div>
          <p class="small muted" style="margin-top:4px">用大白话说您要办的事，我帮您挑日期、挑钟点，选好了到点提醒您。</p>
          <div class="row">
            <input type="text" id="advinput" placeholder="例如：下周和客户签合同" value="${esc(st.text)}">
            <button class="btn" id="advgo">挑时间</button>
          </div>
          <div class="examples">${examples.map((e) => `<button data-ex="${e}">${e}</button>`).join('')}</div>
          ${st.parsed ? `
            <div class="heard">${st.parsed.action
              ? `听懂了：这是「<b>${st.parsed.action.icon} ${st.parsed.action.name}</b>」类的事（关键词“${esc(st.parsed.matched)}”）。`
              : '没归到具体类别，按「综合要事」帮您看整日的气场。'}
              <span class="small muted">（数据最远排到 ${days[days.length - 1].date}）</span></div>
            ${st.slots.length === 0 ? '<p style="margin-top:12px;color:#9E1B1B;font-size:13px">往后一段日子都不太合适，建议再等等。</p>' : ''}
            ${st.slots.map((s) => `
              <div class="slot">
                <div class="top"><span>${s.date} · ${s.weekday} <span class="small muted" style="font-weight:400">农历${s.lunar}</span></span><span class="badge ${s.level}">${levelLabel(s.level)}</span></div>
                <div class="note">${s.note}</div>
                ${(s.windows.length ? s.windows : ['白天均可']).map((w) => {
                  const done = st.justSet.includes(s.date + '|' + w) || pending.some((r) => r.windowLabel === s.date + ' ' + s.weekday + ' ' + w)
                  return `<div class="slotwin"><span>⏰ ${w}</span>${w === '白天均可'
                    ? '<span class="small muted">整日可为</span>'
                    : `<button class="${done ? 'done' : ''}" data-rem="${s.date}|${s.weekday}|${w}" ${done ? 'disabled' : ''}>${done ? '✓ 已记下' : '到点提醒我'}</button>`}</div>`
                }).join('')}
              </div>`).join('')}` : ''}
          ${pending.length ? `
            <div class="remlist">
              <b style="font-size:14px">已约的提醒（${pending.length}）</b>
              ${pending.map((r) => `<div class="rem"><span><b>${esc(r.task)}</b> <span class="muted">${r.windowLabel}</span></span><button class="cancel" data-cancel="${r.id}">取消</button></div>`).join('')}
              <p class="small muted" style="margin-top:8px">提醒在页面打开时生效（授权后也会弹系统通知）。</p>
            </div>` : ''}
        </div>
      </div>`
  }

  function toastHTML() {
    if (!toast) return ''
    return `<div class="toast"><button class="x" id="toastx">×</button><div class="t">⏰ 吉时到了：${esc(toast.task)}</div><div class="b">${toast.windowLabel} 是好时机，可以开始了。祝您顺顺利利！</div></div>`
  }

  function render() {
    if (!days) return
    const pendingCount = loadReminders().filter((r) => !r.fired).length
    $('#app').innerHTML = `
      <header><div class="wrap">
        <div><h1>吉时知日 · 行动助理</h1><p>从看懂黄历，到安排行动 —— 每日日课，落成日程</p></div>
        ${zodiac ? `<div class="zodiac-badge">属${zodiac}</div>` : ''}
      </div></header>
      <nav><div class="wrap">
        <button data-tab="daily" class="${tab === 'daily' ? 'active' : ''}">☀️ 今日行动</button>
        <button data-tab="calendar" class="${tab === 'calendar' ? 'active' : ''}">🗓️ 行动日历</button>
        <button data-tab="profile" class="${tab === 'profile' ? 'active' : ''}">👤 我的日课</button>
      </div></nav>
      <main><div class="wrap">
        ${tab === 'daily' ? dailyHTML() : tab === 'calendar' ? calendarHTML() : profileHTML()}
        <footer>吉时知日堂 · 数据由每日黄历手工核校（${days[0].date} ~ ${days[days.length - 1].date}）<br>内容源自传统择日体系，仅供了解民俗文化参考，行事宜以实际情况为据。</footer>
      </div></main>
      <button class="fab" id="fab">⏰ 有事挑时间${pendingCount ? `<span class="n">${pendingCount}</span>` : ''}</button>
      ${advisorHTML()}
      ${toastHTML()}`
    bind()
  }

  function bind() {
    document.querySelectorAll('[data-tab]').forEach((b) => b.onclick = () => { tab = b.dataset.tab; render() })
    document.querySelectorAll('[data-nav]').forEach((b) => b.onclick = () => {
      const i = days.findIndex((d) => d.date === currentDay().date)
      const j = Math.min(days.length - 1, Math.max(0, i + Number(b.dataset.nav)))
      date = days[j].date; render()
    })
    const dp = $('#datepick'); if (dp) dp.onchange = () => { date = dp.value; render() }
    document.querySelectorAll('[data-date]').forEach((c) => c.onclick = () => { date = c.dataset.date; tab = 'daily'; render() })
    const ca = $('#calaction'); if (ca) ca.onchange = () => { calAction = ca.value; render() }
    document.querySelectorAll('[data-zodiac]').forEach((b) => b.onclick = () => {
      zodiac = b.dataset.zodiac === zodiac ? '' : b.dataset.zodiac
      localStorage.setItem('jszr-zodiac', zodiac); render()
    })
    $('#fab').onclick = () => { advisorOpen = true; render() }
    const mask = $('#advmask'); if (mask) mask.onclick = (e) => { if (e.target === mask) { advisorOpen = false; render() } }
    const close = $('#advclose'); if (close) close.onclick = () => { advisorOpen = false; render() }
    const input = $('#advinput'); if (input) {
      input.onchange = () => { advisorState.text = input.value }
      input.onkeydown = (e) => { if (e.key === 'Enter') analyze(input.value) }
    }
    const go = $('#advgo'); if (go) go.onclick = () => analyze($('#advinput').value)
    document.querySelectorAll('[data-ex]').forEach((b) => b.onclick = () => analyze(b.dataset.ex))
    document.querySelectorAll('[data-rem]').forEach((b) => b.onclick = () => setReminder(b.dataset.rem))
    document.querySelectorAll('[data-cancel]').forEach((b) => b.onclick = () => {
      saveReminders(loadReminders().filter((r) => r.id !== b.dataset.cancel)); render()
    })
    const tx = $('#toastx'); if (tx) tx.onclick = () => { toast = null; render() }
  }

  function analyze(q) {
    q = (q || '').trim(); if (!q) return
    advisorState.text = q
    advisorState.parsed = parseTask(q)
    advisorState.slots = suggestSlots(days, advisorState.parsed, todayLocal(), 3)
    advisorState.justSet = []
    render()
  }

  async function setReminder(payload) {
    const [d, wk, w] = payload.split('|')
    try {
      if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission()
    } catch (e) { /* 忽略 */ }
    const list = loadReminders()
    list.push({ id: Date.now() + '-' + Math.random().toString(36).slice(2, 6), task: advisorState.text.trim(), when: windowStart(d, w), windowLabel: d + ' ' + wk + ' ' + w, fired: false })
    saveReminders(list)
    advisorState.justSet.push(d + '|' + w)
    render()
  }

  /* 每 20 秒检查到点提醒 */
  setInterval(() => {
    if (!days) return
    const list = loadReminders()
    const now = nowStr()
    const due = list.filter((r) => !r.fired && r.when <= now)
    if (due.length) {
      const r = due[0]
      saveReminders(list.map((x) => x.id === r.id ? { ...x, fired: true } : x))
      toast = r
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('吉时到：' + r.task, { body: r.windowLabel + ' 是好时机，可以开始了' })
        }
      } catch (e) { /* 忽略 */ }
      render()
      setTimeout(() => { toast = null; render() }, 12000)
    }
  }, 20000)

  loadDays().then((d) => { days = d; render() })
})()
