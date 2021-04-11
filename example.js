( async () => {
    const api = require( "./bartertrade-api.js" );
    api.auth( 'apikey', 'secret' );
    console.info( await api.order( "ETH/USDT", "Sell", 0.1555, 2111 ) );
    console.info( await api.order( "BART/USDT", "Buy", 1111, 0.043 ) );
    console.info( await api.order( "BART/USDT", "Buy", 1235, 0.045 ) );
  
  // Get Balance
  let balance = await api.balanceRaw();
  console.dir( balance, { depth: null, colors: true } );
  
  // Exchange info
  console.info( await api.exchangeInfo() );
  
  // Cancel an order
  console.info( await api.cancel( 'BART/USDT', '689323' ) );
  
  // Get order status
  console.info( await api.orderStatus( '689323' ) );
  
  } )().catch( e => console.log( e ) );
