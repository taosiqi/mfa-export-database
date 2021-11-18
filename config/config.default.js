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
