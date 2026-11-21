// 共用：對話泡泡、輸入框、表演狀態 show。不依賴其他檔案，誰都可以放心 import。
// 主要負責：趙芸（chaoyun）

const bubble = document.getElementById('bubble'), sayEl = document.getElementById('say');
const askForm = document.getElementById('ask'), q = document.getElementById('q'), sendBtn = document.getElementById('send');
const show = { mode: 'idle', rap: null, complaint: '', count: 0, startBar: 0, kneelK: 0, strikeAt: -9, drawn: '', clock: 0 };

export { askForm, bubble, q, sayEl, sendBtn, show };
