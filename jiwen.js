const { createJiwen } = require('@clarashafiq/jiwen');

// 创建积温实例
const jiwen = createJiwen({
  getLastMessage: () => null,
  connectionRateFn: () => 0.0007,
  verbose: false,
});

let lastTickTime = Date.now();

// 导出API
module.exports = {
  /**
   * 推进状态
   * @param {number} minutes - 经过的分钟数
   * @returns {Promise<{triggers: Array, state: Object}>}
   */
  async tick(minutes = 5) {
    const triggers = await jiwen.tick(minutes);
    return {
      triggers,
      state: await jiwen.getState(),
    };
  },

  /**
   * 获取当前状态
   * @returns {Promise<Object>}
   */
  async getState() {
    const state = await jiwen.getState();
    const context = jiwen.getPromptContext();
    const style = jiwen.getStyleGuidance();
    return { state, context, style };
  },

  /**
   * 应用情绪变化
   * @param {Object} delta - {pride?, valence?, arousal?, connection?}
   * @returns {Promise<Object>}
   */
  async applyDelta(delta) {
    await jiwen.applyDelta(delta);
    return await jiwen.getState();
  },

  /**
   * 重置连接需求
   * @returns {Promise<Object>}
   */
  async resetConnection() {
    await jiwen.resetConnection();
    return await jiwen.getState();
  },

  /**
   * 设置沉浸活动
   * @param {string} type - 活动类型
   * @param {string} label - 活动标签
   */
  async setActivity(type, label) {
    await jiwen.setActivity(type, label);
  },

  /**
   * 获取可读摘要
   * @returns {string}
   */
  getStateSummary() {
    return jiwen.getStateSummary();
  },
};
