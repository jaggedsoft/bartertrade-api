( async () => {
    const crypto = require( "crypto" );
    const cryptojs = require( "crypto-js" );
    //const EventEmitter = require( "events" );
    const axios = require( "axios" );
    //const WebSocket = require( "ws" );
    const fs = require( "fs" );
    const jwt = require( "jsonwebtoken" );
    const exports = module.exports;
    const baseURL = "https://exchange.bartertrade.io/api/";
    const timeout = 30000;
    const instance = axios.create( {
        headers: {
            //"Content-Type": "application/x-www-form-urlencoded",
            //"User-Agent": "node-bartertrade-api"
        },
        timeout,
        baseURL
    } );
    let api_key = "", api_secret = "", verbose = false;

    async function request( endpoint, params = {} ) {
        return new Promise( ( resolve, reject ) => {
            if ( params ) Object.keys( params ).forEach( key => params[key] === undefined && delete params[key] )
            const query = params ? `${ Object.entries( params ).map( ( [ key, val ] ) => `${ key }=${ val }` ).join( "&" ) }` : "";
            let address = `${ baseURL }${ endpoint }${ query ? '?' : '' }${ query }`;
            if ( verbose ) console.info( 'request', address );
            instance.get( address, {
                params
            } ).then( response => {
                if ( response.data.error ) reject( response.data );
                resolve( response.data.result );
            } ).catch( error => {
                if ( error.response ) console.warn( error.response.data );
                reject( error.message );
            } );
        } );
    }

    async function signedRequest( endpoint, params = undefined, method = "POST" ) {
        return new Promise( ( resolve, reject ) => {
            let signature, data = '', url = baseURL + endpoint;
            let contentType = method === "GET" ? "x-www-form-urlencoded" : "application/json";
            let headers = { "Content-Type": contentType };
            if ( method === "GET" ) {
                url = baseURL + endpoint + '?' + sign;
                if ( params ) Object.keys( params ).forEach( key => params[key] === undefined && delete params[key] )
                const query = params ? `${ Object.entries( params ).map( ( [ key, val ] ) => `${ key }=${ val }` ).join( "&" ) }` : "";
                const qs = `api_key=${ api_key }&${ query }`;
                let sorted = new URLSearchParams( qs );
                sorted.sort();
                let querySort = `${ decodeURIComponent( sorted.toString() ) }&secret_key=${ api_secret }`;
                signature = crypto.createHash( 'md5' ).update( querySort, 'utf8' ).digest( 'hex' );
                data = `${ sorted.toString() }&sign=${ signature.toUpperCase() }`;
            } else {
                if ( !params ) params = {};
                let token = exports.token();
                headers.Authorization = token;
                params.api_key = api_key;
                console.info( data );
                data = params;
            }
            if ( verbose ) {
                console.info( headers );
                if ( data ) {
                    console.info( `signedRequest ${ method }: ${ url }` );
                    console.info( data );
                } else console.info( 'signedRequest url', url );
            }
            let authOptions = {
                method,
                url,
                headers
            };
            if ( data ) authOptions.data = data;
            axios( authOptions ).then( response => {
                if ( response.data.error ) reject( response.data );
                resolve( response.data );
            } ).catch( error => {
                if ( error.response ) reject( error.response.data );
            } );
        } );
    }

    function fixMarket( market ) {
        return market.replace( '/', '_' ).replace( '-', '_' );
    }
    exports.fixMarket = fixMarket;

    exports.token = ( payload = {} ) => {
        payload.secretkey = api_secret;
        payload.iat = Date.now();
        payload.exp = payload.iat + timeout;
        return jwt.sign( payload, api_secret );
    }

    exports.authorize = ( file ) => {
        const json = JSON.parse( fs.readFileSync( file, "utf8" ) );
        api_key = json.apikey;
        api_secret = json.secret;
        if ( !api_key || !api_secret ) throw "Invalid key, or secret";
    }

    exports.auth = ( key, secret ) => {
        if ( !key || !secret ) throw "Invalid key, or secret";
        api_key = key;
        api_secret = secret;
    }

    // server time
    exports.serverTime = async () => {
        return request( `server.time`, {} );
    };

    // asset precision
    exports.assetPrecision = async () => {
        let response = request( `asset.list`, {} );
        return Object.fromEntries( Object.entries( response ).map( ( [ k, v ] ) => [ k, v * v ] ) );
    };

    // all markets
    exports.markets = async () => {
        let markets = [], data = await request( `market.list`, {} );
        for ( let obj of data ) {
            markets[obj.name] = obj;
        }
        return markets;
    };

    // all tickers
    exports.tickers = async () => {
        //return request( `allticker`, {} );
        let ticker = [], response = await axios.get( `${ baseURL }allticker` );
        for ( let obj of response.data.ticker ) {
            ticker[obj.symbol] = obj;
            delete ticker[obj.symbol].symbol;
        }
        return ticker;
    };

    // last price for an asset
    exports.lastPrice = async ( market ) => {
        let response = await request( `market.last`, { market } );
        return response.result;
    };

    // bid/ask count and amount
    exports.marketSummary = async ( markets = [] ) => {
        return request( `market.summary`, { markets } );
    };

    // kline chart history
    exports.chart = async ( market, interval = 60, start_time = false, end_time = false ) => {
        if ( !end_time ) end_time = Math.round( Date.now() / 1e3 );
        if ( !start_time ) start_time = end_time - ( interval * 1e3 );
        //.result returns [time ,open, close, high, low ,volume, deal, market]
        return request( `market.kline`, { market, start_time, end_time, interval } );
    };

    // price and volume since 24h ago
    exports.marketStatus24h = async ( market ) => {
        return request( `market.status24h`, { market } );
    };

    // price and volume since midnight utc
    exports.marketStatus = async ( market ) => {
        return request( `market.status_today`, { market } );
    };

    // market depth
    //chartType – (string) – Month, Daily, or Intraday
    /*exports.depth = async ( market, side = "Buy", chartType = "Intraday", lastreqtime = 0 ) => {
        if ( !lastreqtime ) lastreqtime = Date.now();
        return signedRequest( `v1/getorderbook`, { pair:fixMarket( market ), side, chartType, lastreqtime }, 'POST' );
    };*/

    exports.depth = async ( market, side = "Buy", ) => {
        return signedRequest( `v1/getMarketPrice`, { pair:fixMarket( market ), side }, 'POST' );
    };

    // level 1 market depth
    exports.quote = async ( market, pricePrecision = 8 ) => {
        let one = await exports.depth( market, "Sell" );
        if ( !one.status ) throw `quote(${ market }) bid error: ` + JSON.stringify( one );
        let two = await exports.depth( market, "Buy" );
        if ( !two.status ) throw `quote(${ market }) ask error: ` + JSON.stringify( two );
        if ( two.data == 0 && market.startsWith( 'BART' ) ) two.data = 1;
        if ( one.data == 0 || two.data == 0 ) throw `quote(${ market }) error: missing bid/ask!\n${ JSON.stringify( one ) }\n${ JSON.stringify( two ) }`;
        const bidraw = Math.min( one.data, two.data ), askraw = Math.max( one.data, two.data );
        //return request( `order.depth`, { market, limit, interval:precision } );
        let increment = 1 / 10 ** pricePrecision;//Number( ( 1 / 10 ** pricePrecision ).toFixed( pricePrecision ) );
        let bid = Number( bidraw ), ask = Number( askraw );
        let mid = ( bid + ask ) / 2, spread = ask / bid * 100 - 100;
        let minBuy = ( bid + increment ).toFixed( pricePrecision );
        let maxSell = ( ask - increment ).toFixed( pricePrecision );
        let buy = ( ( Number( minBuy ) + mid ) / 2 ).toFixed( pricePrecision );
        let sell = ( ( Number( maxSell ) + mid ) / 2 ).toFixed( pricePrecision );
        return { bid, ask, mid, spread, increment, buy, sell };
    };
    // x https://api.hotbit.io/api/v1/order.book?market=ETH/BTC&side=1&offset=0&limit=10

    //market.status https://api.hotbit.io/api/v1/market.status?market=ETH/BTC&period=86400
    //daily volume, trades, ohlc https://api.hotbit.io/api/v1/market.status_today?market=ETH/BTC
    //market.status24h daily volume, trades, ohlc https://api.hotbit.io/api/v1/market.status24h

    // SIGNED
    //https://api.hotbit.io/api/v1/order.put_limit

    //order.put_limit https://github.com/hotbitex/hotbit.io-api-docs/blob/master/rest_api.md#orderput_limit
    //order.finished_detail
    //balance.history
    //market.deals https://github.com/hotbitex/hotbit.io-api-docs/blob/master/rest_api.md#marketdeals

    // balances
    exports.balances = async ( assets = '["BTC","USDT"]' ) => {
        return signedRequest( `balance.query`, { assets }, 'GET' );
    };

    // user trade history
    exports.userDeals = async ( market, offset = 0, limit = 1000 ) => {
        return signedRequest( `market.user_deals`, { market, offset, limit }, 'GET' );
    };

    // user pending trades
    //side – (string) – “All” or “Sell” or “Buy”
    exports.openOrders = async ( market, side = 'All' ) => {
        return signedRequest( `v1/getUserOpenOrders`, { pair:fixMarket( market ), side }, 'POST' );
    };

    // user available/frozen balances & btc value
    exports.balance = async () => {
        let data = await signedRequest( `v1/getfrozenbalance`, {}, 'POST' );
        if ( !data.status ) throw `balance error: ${ JSON.stringify( data ) }`;
        let list = {}, prices = {}, obj, now = Date.now(), day = 86400 * 1e3;
        for ( obj of data.marketprices ) {
            if ( now - new Date( obj.updated_date ) > day ) continue;
            prices[obj.coin] = { usd: obj.usd_price, btc: obj.btc_price };
        }
        prices.USDT = prices.TUSD = { usd: 1, btc: 1 / prices.BTC.usd };
        for ( obj of data.list ) {
            let out = { available:obj.available, onOrder: obj.inorder, total:obj.balance };
            if ( prices[obj.coin] ) {
                let { usd, btc } = prices[obj.coin];
                out.value = {
                    each: { usd, btc },
                    available: { usd: usd * obj.available, btc: btc * obj.available },
                    onOrder: { usd: usd * obj.inorder, btc: btc * obj.inorder },
                    total: { usd: usd * obj.balance, btc: btc * obj.balance }
                };
            }
            list[obj.coin] = out;
        }
        return list;
    };

    // user available/frozen balances & btc value (raw unprocessed data)
    exports.balanceRaw = async () => {
        return signedRequest( `v1/getfrozenbalance`, {}, 'POST' );
    };

    // get coins list
    exports.exchangeInfo = async () => {
        return signedRequest( `v1/getcoins`, {}, 'POST' );
    };

    // closed orders https://priti-upadhyay.gitbook.io/bartertrade/all-orders
    // klines https://priti-upadhyay.gitbook.io/bartertrade/get-candlestick-data
    // trade history https://priti-upadhyay.gitbook.io/bartertrade/account-trade-list
    // bart fee status https://priti-upadhyay.gitbook.io/bartertrade/bart-fee-availability

    // user completed trades
    /*exports.userFinishedDeals = async ( market, params = {} ) => {
        // start_time = false, end_time = false, offset = 0, limit = 1000, side = false
        if ( !params.end_time ) end_time = Math.round( Date.now() / 1e3 );
        if ( !params.start_time ) start_time = end_time - ( interval * 1e3 );
        if ( params.side ) {
            if ( params.side == 'sell' ) params.side = 1;
            if ( params.side == 'buy' ) params.side = 2;
        }
        params.market = market;
        if ( !params.offset ) params.offset = 0;
        if ( !params.limit ) params.limit = 1000;
        return signedRequest( `order.finished`, params, 'GET' );
    };*/

    // order info
    exports.orderStatus = async ( orderid ) => {
        return signedRequest( `v1/getOrderStatus`, { orderid }, 'POST' );
    };

    // cancel order
    exports.cancel = async ( market, orderid ) => {
        return signedRequest( `v1/cancelorder`, { pair:fixMarket( market ), orderid }, 'POST' );
    };

    // exports.batchCancel = async(market, ids) { // max 10 per request
    //     order.batch_cancel
    //     return signedRequest( `order.cancel`, { market, order_id }, 'GET' );
    // }

    // limit order
    exports.order = async ( market, side, amount, price, type = 'limit' ) => {
        market = fixMarket( market );
        let [ coin1, coin2 ] = market.split( '_' );
        /*
        form: {"amount":2},
        market_price: 0.2,
        side: "Sell",
        market: "market",
        coin1: "BART",
        coin2: "ETH",
        marketPrice: 0.2,

        form – (Object) – form data – amount, price
        api_key – (string) - Key to access the user’s data
        coin1 - (string) – Token Symbol
        coin2 - (string) – Second Token Symbol
        market – (string) – Type of Order (Market, Limit, Pie )
        side - (string) - sell / buy
        market_price : (decimal) : barter trade  price
        marketprice : (decimal): calculated coinbase market price
        */
        let form = { "amount":amount };
        if ( type == 'limit' ) form.price = price;
        let payload = { market:type, side, coin1, coin2, form, market_price: price, marketPrice: price };
        return signedRequest( `v1/order`, payload, 'POST' );
    };

    exports.limit = async( market, side, amount, price ) => {
        return exports.order( market, side, amount, price, 'limit' );
    }
    exports.market = async( market, side, amount, price ) => {
        return exports.order( market, side, amount, price, 'market' );
    }
    exports.cancelAll = async ( market, side = 'All' ) => {
        let cancelled = 0, openOrders = await exports.openOrders( market, side );
        console.info( openOrders );
        for ( let obj of openOrders.openOrders ) {
            console.info( obj );
        }

    }
    /*exports.cancelAll = async( market, side = false ) => {
        let cancelled = 0, max = Infinity, openOrders = await signedRequest( `order.pending`, { market, offset, limit }, 'GET' );
        if ( !openOrders[market] || !openOrders[market].records ) return console.warn( `cancelAll ${ market } ${ side }: no records`, openOrders );
        for ( let obj of openOrders[market].records ) {
            if ( side && side != obj.side ) continue;
            //console.info( obj );
            console.info( `..${ obj.market } ${ sides[obj.side] } ${ obj.amount } @ ${ obj.price }` );
            if ( ++cancelled >= max ) break;
            await exports.cancel( obj.market, obj.id );
        }
    };*/

} )();
