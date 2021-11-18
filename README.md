# 前言

egg.js定时任务备份微信小程序云开发数据库，这里只是简单实现，验证方法有效性，代码比较凌乱，有需要的可以把service下的代码整理一下自用。

参数配置参考我另外一篇文章【[巧用Node.js process隐藏项目重要参数](https://juejin.cn/post/7028865719102079012)】

git地址：https://github.com/taosiqi/mfa-export-database

# 代码

## config/config.default.js

```javascript
/* eslint valid-jsdoc: "off" */

'use strict';

/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
module.exports = appInfo => {
  /**
   * built-in config
   * @type {Egg.EggAppConfig}
   **/
  const config = exports = {};
  
  // 微信相关参数
  config.wx = {
    appid: process.env.wx_appid,
    secret: process.env.wx_secret,
    env: process.env.wx_env, // 云环境ID
  };
  // 腾讯云cos参数
  config.cos = {
    secretId: process.env.cos_secretId,
    secretKey: process.env.cos_secretKey,
    bucket: process.env.cos_bucket,
    region: process.env.cos_region,
  };
  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + '_1637136443161_2316';
  config.cors = {
    origin: '*',
    allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH',
  };
  // add your middleware config here
  config.middleware = [];

  // add your user config here
  const userConfig = {
    // myAppName: 'egg',
  };

  return {
    ...config,
    ...userConfig,
  };
};
```

## controller/home.js

```javascript
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
```

## schedule/export.js

```javascript
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
```

## service/home.js

```javascript
'use strict';
const dayjs = require('dayjs');
const COS = require('cos-nodejs-sdk-v5');
const Service = require('egg').Service;
const file_path = `${dayjs().format('YYYY-MM-DD HH:mm:ss')}.json`;
const url = 'https://api.weixin.qq.com/';
class Index extends Service {
  async index() {
    const { ctx, config: { wx } } = this;
    // 获取access_token
    const { data: { access_token } } = await ctx.curl(`${url}cgi-bin/token?grant_type=client_credential&appid=${wx.appid}&secret=${wx.secret}`, {
      dataType: 'json',
    });
    if (!access_token) return { statusCode: 400 };
    // 获取job_id
    const { data: { job_id } } = await ctx.curl(`${url}tcb/databasemigrateexport?access_token=${access_token}`, {
      method: 'POST',
      contentType: 'json',
      data: {
        env: wx.env,
        file_path,
        file_type: '1',
        query: 'db.collection("SecretList").get()', // 要获取的数据，也可以自己写
      },
      dataType: 'json',
    });
    if (!job_id) return { statusCode: 400 };
    return await this.firmwareTimer(access_token, job_id);
  }

  async firmwareTimer(access_token, job_id) {
    const { ctx, config: { wx, cos } } = this;
    const cloudCos = new COS({
      SecretId: cos.secretId,
      SecretKey: cos.secretKey,
    });
    // 导出任务需要时间完成，数据越大需要的时间越多，我这里200k数据大约需要5-10s
    return new Promise(resolve => {
      let count = 10;
      let firmwareTimer = setInterval(async () => {
        count -= 1; // 防止长时间使用setInterval，10次后自动清除
        // 通过job_id拿到文件
        const { data: { status, file_url } } = await ctx.curl(`${url}tcb/databasemigratequeryinfo?access_token=${access_token}`, {
          method: 'POST',
          contentType: 'json',
          data: {
            env: wx.env,
            job_id,
          },
          dataType: 'json',
        });
        if (status === 'success') {
          clearInterval(firmwareTimer);
          firmwareTimer = null;
          const { data } = await ctx.curl(file_url);
          // 上传到腾讯云oss
          cloudCos.putObject({
            Bucket: cos.bucket,
            Region: cos.region,
            Key: `bt_backup/mfa-export-database/${file_path}`,
            Body: data,
          }, function(err, data) {
            resolve(err || data);
          });
        }
        if (count) {
          clearInterval(firmwareTimer);
          firmwareTimer = null;
        }
      }, 5000);
    });
  }
}

module.exports = Index;
```

## 引用

[egg - 为企业级框架和应用而生](https://eggjs.org/zh-cn/)

[在线cron表达式生成](https://cron.qqe2.com/)

[巧用Node.js process隐藏项目重要参数](https://juejin.cn/post/7028865719102079012)

# 结语

如果觉得这篇文章对您有帮助的话，欢迎点赞评论加转发。[首发于语雀文档@is_tao](https://www.yuque.com/docs/share/4f81e897-e230-4e47-adb3-bfe81491fd70)
