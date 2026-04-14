const fetch = require('node-fetch');
const { saveStreamToDatabase, closePool, deleteDateFromTable } = require('./chumbak_db_utils');

function getChumbakTimestamp() {
  const d = new Date();
  const date = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  let hours = d.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12; hours = hours ? hours : 12;
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${date} ${hours}:${minutes}:${seconds} ${ampm}`;
}

async function fetchYesterday() {
  const url = "https://chumbakreport.eshopaid.com/shopaid/rpt_dailysales/DownloadCSV.aspx";
  const cookies = "path=/eShopaid/Cookies; ASP.NET_SessionId=vmge0iby2rbbiymcy0dc0t4c";

  console.log(`🚀 Starting Daily T-1 Sync...`);

  const d = new Date();
  d.setDate(d.getDate() - 1);

  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();

  const requestDate = `${mm}/${dd}/${yyyy}`;
  const dbDate = `${dd}/${mm}/${yyyy}`;

  console.log(`\nProcessing Yesterday: ${requestDate}...`);

  // 1. Clean the date in DB
  await deleteDateFromTable(dbDate);

  const ts = getChumbakTimestamp();
  const formData = new URLSearchParams({
    BillSeries: "All", FromDate: requestDate, ToDate: requestDate, SalesType: "-1",
    AllZone: "true", AllType: "true", AllCluster: "true", AllBrand: "true",
    ZoneCode: "0", StoreType: "0", StoreCluster: "0", StoreBrand: "0", RegionCode: "0", StoreCode: "0",
    AllRegion: "true", AllStore: "true", UserName: "sharavana", LoggedUserStore: "4", UserStoreCode: "4",
    Mode: "Detail", StoreName: "All", RegionName: "All", filename: `Daily-T1.csv`,
    ChannelType: "0", AllChannelType: "true", MID: "95", t: ts
  });

  try {
    const res = await fetch(url + "?t=" + encodeURIComponent(ts), {
      method: "POST",
      headers: { "cookie": cookies, "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString()
    });

    if (res.ok) {
      const { inserted } = await saveStreamToDatabase(res.body);
      console.log(` -> Success: ${inserted} rows synced.`);
    } else {
      console.error(` -> Failed: ${res.status}`);
    }
  } catch (err) {
    console.error(` -> Error: ${err.message}`);
  }

  console.log("\n✅ Daily Sync Complete!");
  await closePool();
}

fetchYesterday().catch(console.error);
