/**
 * 全局配置 / 常量 / 共享状态。
 *
 * content_scripts 的多个 JS 文件被注入到同一个 isolated world，按 manifest.json
 * 中 js 数组的顺序执行。各模块通过 window.BPRFT 命名空间共享数据与函数，
 * 因此这里定义的对象在其它模块中可直接读取。
 */
(() => {
  'use strict';

  const NS = (window.BPRFT = window.BPRFT || {});

  NS.DEFAULT_SETTINGS = {
    min: 0.1,
    max: 4,
    step: 0.01,
    fineStep: 0.05,
    presets: [0.5, 0.75, 1, 1.25, 1.5, 2, 3]
  };

  NS.CONFIG = {
    ...NS.DEFAULT_SETTINGS,
    hideDelay: 600,
    containerSel: '.bpx-player-ctrl-playbackrate',
    menuSel: '.bpx-player-ctrl-playbackrate-menu',
    resultSel: '.bpx-player-ctrl-playbackrate-result',
    unloginSel: '.bpx-player-ctrl-playbackrate-unlogin',
    unloginStateCls: 'bpx-player-ctrl-playbackrate-unlogin-state',
    titleSel: '.video-info-title h1.video-title',
    videoAreaSel: '.bpx-player-video-area',
    boostFactor: 2
  };

  NS.LONG_PRESS_DELAY = 300; // 与 B 站原生一致的长按阈值(ms)
  NS.SEEK_STEP = 5;          // 短按 → 快进 5 秒，保留原生行为

  // 与 B 站 lottie 动画一致的三段箭头：每段 opacity 在 15%~80% 间脉动、
  // 依次相差 1/6 秒，形成从左向右“滚动”的动态效果。
  const HINT_CHEVRON =
    'M6.138 3.546C6.468 4.106 6.278 4.826 5.718 5.156C5.538 5.266 5.338 5.326 5.118 5.326' +
    'L-5.122 5.326C-5.772 5.326-6.302 4.796-6.302 4.146C-6.302 3.936-6.242 3.726-6.142 3.546' +
    'L-1.352-4.554C-0.912-5.294 0.048-5.544 0.798-5.104C1.028-4.974 1.218-4.784 1.348-4.554Z';
  const chevronGroup = (x, delay) =>
    '<g transform="matrix(0,3,-3,0,' + x + ',32.5)" opacity="0.15">' +
    '<animate attributeName="opacity" values="0.15;0.8;0.15" keyTimes="0;0.5;1"' +
    ' dur="1s" begin="' + delay + 's" repeatCount="indefinite" calcMode="spline"' +
    ' keySplines="0.167 0.167 0.833 0.833;0.167 0.167 0.833 0.833"/>' +
    '<path d="' + HINT_CHEVRON + '"/></g>';
  NS.HINT_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 111 66" width="111" height="66"' +
    ' preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%"><g fill="#fff">' +
    chevronGroup(16.5, 0) + chevronGroup(55.5, 0.167) + chevronGroup(94.5, 0.333) +
    '</g></svg>';

  // 注意：不能把 'ratechange' 放进 reapply 事件，否则会和 B 站原生的
  // 长按倍速互相覆盖（详见 boost 模块）。
  NS.REAPPLY_EVENTS = ['loadedmetadata', 'loadeddata', 'canplay', 'play', 'seeked', 'durationchange'];

  NS.state = {
    injected: false,
    video: null,
    desired: 1,
    defaultRate: 1,
    refs: null,
    title: '',
    titleRules: [],
    titleMatchEnabled: true,
    boosting: false,
    boostBase: 1,
    pressing: false,
    longPress: false,
    pressTimer: null,
    hintNode: null
  };
})();
