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
