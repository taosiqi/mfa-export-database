'use strict';
const Controller = require('egg').Controller;

class HomeController extends Controller {
  async index() {
    const { ctx } = this;
    const result = await ctx.service.home.index();
    ctx.logger.info('通过url主动触发备份， 结果: %j', result.statusCode);
    ctx.body = result.statusCode;
  }
}

module.exports = HomeController;
