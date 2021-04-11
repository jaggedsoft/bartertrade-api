<!--<img src='https://bartertrade.io/images/logo-full.png'>
<a href='https://github.com/jaggedsoft/bartertrade-api/releases'><img src='https://img.shields.io/github/release/jaggedsoft/bartertrade-api.svg?style=flat-square&labelColor=blueviolet&label=release'></a> <img src='https://img.shields.io/github/last-commit/jaggedsoft/bartertrade-api.svg?maxAge=2400&labelColor=333&label=🟣%20updated'> [![Monthly Downloads](https://img.shields.io/npm/dm/bartertrade-api.svg?labelColor=29B6F6&color=3D5AFE&label=downloads&logo=bitcoin-lightning)](https://npm-stat.com/charts.html?package=bartertrade&from=2020-04-11&to=2020-07-01)
<a href='https://twitter.com/jaggedsoft'><img src='https://img.shields.io/twitter/follow/jaggedsoft.svg?style=social'></a>-->
[![NPM](https://nodei.co/npm/bartertrade.png?compact=true)](https://npmjs.org/package/bartertrade)

# Node Bartertrade API
This project is designed to help you make your own projects that interact with the [Bartertrade API](https://priti-upadhyay.gitbook.io/bartertrade/)

#### Installation: **`npm install -s bartertrade`**
[![npm install bartertrade](https://nodei.co/npm/bartertrade.png?mini=true)](https://npmjs.org/package/bartertrade)

#### Getting started
```javascript
( async () => {
    const api = require( "./bartertrade-api.js" );
    api.auth( 'apikey', 'secret' );
    
    // Get Balance
    let balance = await api.balance();
    console.dir( balance, { depth: null, colors: true } );
    
} )().catch( e => console.log( e ) );
```

```js
console.info( await api.order( "ETH/USDT", "Sell", 0.1555, 2111 ) );
console.info( await api.order( "BART/USDT", "Buy", 1111, 0.043 ) );
console.info( await api.order( "BART/USDT", "Buy", 1235, 0.045 ) );

// Get Balance
let balance = await api.balance();
console.dir( balance, { depth: null, colors: true } );

// Exchange info
console.info( await api.exchangeInfo() );

// Cancel an order
console.info( await api.cancel( 'BART/USDT', '689323' ) );

// Get order status
console.info( await api.orderStatus( '689323' ) );
```
