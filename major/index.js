const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const readline = require('readline');

puppeteer.use(StealthPlugin());

const majorArt = `
  __  __        _            
 |  \\/  | __ _ (_) ___  _ __ 
 | |\\/| |/ _\` || |/ _ \\| '__|
 | |  | | (_| || | (_) | |   
 |_|  |_|\\__,_|/ |\\___/|_|   
  \x1b[33mBOTERDROP\x1b[0m  |__/   \x1b[33mv1.1\x1b[0m           
`;

const sukses = '  \x1b[32m!\x1b[0m  ';
const gagal = '  \x1b[31m!\x1b[0m  ';
const info = '  \x1b[33m?\x1b[0m  ';

async function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

async function fetchWithRetry(page, url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await page.evaluate(async (url, options) => {
        const res = await fetch(url, options);
        const data = await res.json();
        return { status: res.status, data };
      }, url, options);
      return response;
    } catch (error) {
      //console.error(`${gagal} RETRY      | Attempt ${i + 1} failed: ${error.message}`);
      await delay(2000);
    }
  }
  throw new Error(`Failed to fetch ${url} after ${retries} retries`);
}

let totalBalance = 0;

async function processAccount(payload, accountIndex) {

  const sukses = '  \x1b[32m!\x1b[0m  ';
  const gagal = '  \x1b[31m!\x1b[0m  ';
  const info = '  \x1b[33m?\x1b[0m  ';


  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  await page.setViewport({ width: 1280, height: 800 });

  // Get token
  let getTokenResponse;
  console.log('')
  try {
    getTokenResponse = await fetchWithRetry(page, 'https://major.glados.app/api/auth/tg/', {
      method: 'POST',
      headers: {'Content-Type': 'application/json' },
      body: JSON.stringify({ init_data: payload })
    });
  } catch (error) {
    console.error(`Failed to get token for account ${accountIndex + 1}: ${error.message}`);
    await browser.close();
    return;
  }

  const token = getTokenResponse.data.access_token;
  console.log(`${sukses} LOGIN      | \x1b[32mAkun Ke-${accountIndex + 1}\x1b[0m`);

  const userId = getTokenResponse.data.user.id;

  // Info User
  let infoUser;
  try {
    infoUser = await fetchWithRetry(page, `https://major.glados.app/api/users/${userId}/`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  } catch (error) {
    console.error(`${gagal} Failed to get user info for account ${accountIndex + 1}: ${error.message}`);
    await browser.close();
    return;
  }

  // User Rank
  let userRank;
  try {
    userRank = await fetchWithRetry(page, `https://major.glados.app/api/users/top/position/${userId}/`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  } catch (error) {
    console.error(`${gagal} Failed to get user rank for account ${accountIndex + 1}: ${error.message}`);
    await browser.close();
    return;
  }

  console.log(`${info} INFO USER  | \x1b[33mID: ${infoUser.data.id}, Username: ${infoUser.data.username}, Squad: ${infoUser.data.squad_id}, Rank: ${userRank.data.position}\x1b[0m`);

  // Login Streak Day
  let loginStreakDay;
  try {
    loginStreakDay = await fetchWithRetry(page, 'https://major.glados.app/api/user-visits/visit/', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  } catch (error) {
    console.error(`${gagal} Failed to get login streak day for account ${accountIndex + 1}: ${error.message}`);
    await browser.close();
    return;
  }
  if (loginStreakDay.data.is_allowed === false){
  console.log(`${gagal} CHECK IN   | is_allowed: ${loginStreakDay.data.is_allowed}`);
  console.log(`${gagal} CHECK IN   | Gagal, Silahkan Check Manual`);
  } else {
  console.log(`${info} CHECK IN   | is_allowed: ${loginStreakDay.data.is_allowed}`);
  console.log(`${info} CHECK IN   | Day: ${loginStreakDay.data.streak}`);  
  }

  // Cek Hold Coins
  let cekHoldCoins;
  try {
    cekHoldCoins = await fetchWithRetry(page, 'https://major.glados.app/api/bonuses/coins/', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  } catch (error) {
    console.error(`${gagal} Failed to check hold coins for account ${accountIndex + 1}: ${error.message}`);
    await browser.close();
    return;
  }

  if (cekHoldCoins.data.is_available) {
    // Start Hold Coins
    const coins = Math.floor(Math.random() * (900 - 850 + 1)) + 850;
    let startHoldCoins;
    try {
      startHoldCoins = await fetchWithRetry(page, 'https://major.glados.app/api/bonuses/coins/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ coins })
      });
    } catch (error) {
      console.error(`${gagal} Failed to start hold coins for account ${accountIndex + 1}: ${error.message}`);
      await browser.close();
      return;
    }
    console.log(`${sukses} HOLD COIN  | \x1b[32mSukses, Reward: ${coins}\x1b[0m`);
  } else {
    console.log(`${gagal} HOLD COIN  |\x1b[31m Masih Delay\x1b[0m`);
  }

  // Start Spin
  let startSpin;
  try {
    startSpin = await fetchWithRetry(page, 'https://major.glados.app/api/roulette', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error(`${gagal} Failed to start spin for account ${accountIndex + 1}: ${error.message}`);
    await browser.close();
    return;
  }

  if (startSpin.data.result) {
    console.log(`${sukses} SPIN       | \x1b[32mSukses, Reward: ${startSpin.data.rating_award}\x1b[0m`);
  } else {
    console.log(`${gagal} SPIN       | \x1b[31mMasih Delay\x1b[0m`);
  }

  // Check Swipe Coin
  let checkSwipeCoinResponse;
  try {
    checkSwipeCoinResponse = await fetchWithRetry(page, 'https://major.glados.app/api/swipe_coin/', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  } catch (error) {
    console.error(`${gagal} Failed to check swipe coin for account ${accountIndex + 1}: ${error.message}`);
    await browser.close();
    return;
  }

  if (checkSwipeCoinResponse.data.success) {
    // Start Swipe Coin
    const coins = Math.floor(Math.random() * (3200 - 2800 + 1)) + 2800;
    let startSwipeCoinResponse;
    try {
      startSwipeCoinResponse = await fetchWithRetry(page, 'https://major.glados.app/api/swipe_coin/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ coins })
      });
    } catch (error) {
      console.error(`${gagal} Failed to start swipe coin for account ${accountIndex + 1}: ${error.message}`);
      await browser.close();
      return;
    }

    if (startSwipeCoinResponse.data.success) {
      console.log(`${sukses} SWIPE COIN | \x1b[32mSukses, Coins: ${coins}\x1b[0m`);
    } else {
      console.log(`${gagal} SWIPE COIN | \x1b[31mMasih Delay\x1b[0m`);
    }
  } else {
    if (checkSwipeCoinResponse.data.detail) {
      console.log(`${gagal} SWIPE COIN | \x1b[31mMasih Delay\x1b[0m`);
    } else {
      console.log(`${gagal} SWIPE COIN | Unable to swipe coins`);
    }
  }


  // List Task Daily False
  let listTaskDailyFalse;
  try {
    listTaskDailyFalse = await fetchWithRetry(page, 'https://major.glados.app/api/tasks/?is_daily=false', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  } catch (error) {
    console.error(`${gagal} Failed to list daily false tasks for account ${accountIndex + 1}: ${error.message}`);
    await browser.close();
    return;
  }

  // List Task Daily True
  let listTaskDailyTrue;
  try {
    listTaskDailyTrue = await fetchWithRetry(page, 'https://major.glados.app/api/tasks/?is_daily=true', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  } catch (error) {
    console.error(`${gagal} Failed to list daily true tasks for account ${accountIndex + 1}: ${error.message}`);
    await browser.close();
    return;
  }

  // Start Tasks
  const startTasks = async (taskId) => {
    return await fetchWithRetry(page, 'https://major.glados.app/api/tasks/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ task_id: taskId })
    });
  };

  const allTasks = [...listTaskDailyFalse.data, ...listTaskDailyTrue.data];
  for (const task of allTasks) {
    let taskResponse;
    try {
      taskResponse = await startTasks(task.id);
    } catch (error) {
      console.error(`${gagal} Failed to start task ${task.id} for account ${accountIndex + 1}: ${error.message}`);
      continue;
    }
    if (taskResponse.data.is_completed) {
      console.log(`${sukses} TASK       | \x1b[32mStatus: Sukses, Reward: ${task.award}, Title: ${task.title}\x1b[0m`);
    } else {
      console.log(`${gagal} TASK       | \x1b[31mStatus: Gagal, Title: ${task.title}\x1b[0m`);
    }
  }

  // Final Info User
  let finalInfoUser;
  try {
    finalInfoUser = await fetchWithRetry(page, `https://major.glados.app/api/users/${userId}/`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  } catch (error) {
    console.error(`${gagal} Failed to get final user info for account ${accountIndex + 1}: ${error.message}`);
    await browser.close();
    return;
  }

  const balance = finalInfoUser.data.rating;
  totalBalance += balance;

  console.log(`${info} BALANCE    | ${finalInfoUser.data.rating}`);

  await browser.close();
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

async function countdown(duration) {
  let remaining = duration;
  const animationChars = ['✶', '✸', '✹', '✺', '✹', '✷'];
  let animationIndex = 0;

  while (remaining > 0) {
    process.stdout.write(`\r  \x1b[33m${animationChars[animationIndex]}\x1b[0m   Countdown  : ${formatTime(remaining)}`);
    await delay(100);
    remaining -= 100;
    animationIndex = (animationIndex + 1) % animationChars.length;
  }
  process.stdout.write('\r  \x1b[32m!\x1b[0m   Countdown  : Selesai        '); 
  console.log('');
}

async function main() {

  console.log(majorArt);
  
  while (true) {
  const fileStream = fs.createReadStream('hash.txt');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  
  let accountIndex = 0;
  for await (const line of rl) {
    await processAccount(line, accountIndex);
    accountIndex++;
    await delay(5000);
  }
  console.log('');
  console.log(`${info} \x1b[33mTotal Balance Dari ${accountIndex} Akun : ${totalBalance}\x1b[0m`);
  console.log('');
  await countdown(8 * 60 * 60 * 1000 + 10000);
}
}

main();