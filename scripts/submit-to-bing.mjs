import fetch from 'node-fetch';

const DOMAIN = 'gallery.selfboot.cn';
const BING_KEY = '90d513c720ec40e3a57f488239db260c';
const KEY_LOCATION = `https://${DOMAIN}/${BING_KEY}.txt`;

async function submitToBing(urls) {
  if (!urls || urls.length === 0) {
    console.log('没有URL需要提交');
    return;
  }

  console.log('准备提交以下URL到Bing:', urls);

  const payload = {
    host: DOMAIN,
    key: BING_KEY,
    keyLocation: KEY_LOCATION,
    urlList: urls
  };

  try {
    console.log('提交payload:', payload);
    
    const response = await fetch('https://api.indexnow.org/IndexNow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    const status = response.status;
    console.log(`提交状态码: ${status}`);

    switch (status) {
      case 200:
        console.log('URL提交成功！');
        break;
      case 400:
        console.error('提交格式错误');
        break;
      case 403:
        console.error('API密钥无效');
        break;
      case 422:
        console.error('URL不属于指定域名或密钥格式不匹配');
        break;
      case 429:
        console.error('请求过于频繁，可能被视为垃圾请求');
        break;
      default:
        console.error(`未知错误: ${status}`);
    }
  } catch (error) {
    console.error('提交过程中发生错误:', error);
  }
}

async function submitNewUrlsToBing() {
  console.log('开始获取今天更新的页面URL...');
  
  const { getRecentPageUrls } = await import('./track-page-changes.mjs');
  const urls = await getRecentPageUrls();
  
  if (urls.length > 0) {
    await submitToBing(urls);
  } else {
    console.log('今天没有更新的页面，不需要提交');
  }
}

// 直接执行主函数
console.log('开始执行 bing index now脚本...');
submitNewUrlsToBing().catch((error) => {
  console.error('执行过程中发生错误:', error);
  process.exit(1);
});

export { submitToBing };
