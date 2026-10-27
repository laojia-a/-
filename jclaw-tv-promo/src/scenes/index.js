// Scene registry: each scene is (ctx, localTime, globalTime) -> { grade, overlay, ... }
const { text, font, W, H } = require('../lib');
const placeholder = (name) => (ctx, lt) => {
  ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, H);
  text(ctx, `${name} ${lt.toFixed(2)}`, W / 2, H / 2, { font: font(700, 60, 'inter'), color: '#666' });
  return {};
};
const load = (id) => { try { return require('./' + id); } catch (e) { if (e.code === 'MODULE_NOT_FOUND' && e.message.includes(`/${id}'`)) return placeholder(id); throw e; } };
module.exports = Object.fromEntries(['cold', 'storm', 'title', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'special', 'finale'].map((id) => [id, load(id)]));
