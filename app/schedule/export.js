'use strict';
const Subscription = require('egg').Subscription;

class UpdateCache extends Subscription {
  // 通过 schedule 属性来设置定时任务的执行间隔等配置
  static get schedule() {
    return {
      interval: '0 10 2 * * ?', // 每天的2点10分执行一次
      type: 'all', // 指定所有的 worker 都需要执行
    };
  }
  // subscribe 是真正定时任务执行时被运行的函数
  async subscribe() {
    const { ctx } = this;
    const result = await ctx.service.home.index();
    ctx.logger.info('定时任务执行消息提醒 结果: %j', result.statusCode);
  }
}

module.exports = UpdateCache;
