// const { Scenes } = require('telegraf');

// const { getActivePaymentsByCard } = require('../../notion/notion_functions')

// // const masivePaymentsScene = new Scenes.BaseScene('MASSIVE_PAYMENTS');

// masivePaymentsScene.on("message", async (ctx) => {
//     const accountIndex = parseInt(ctx.message.text) - 1;
//     const accountsData = ctx.state.accountsData;
//     const accountName = accountsData[accountIndex]?.cuentaNombre
//     console.log(accountIndex);
//     console.log(accountName);
    
//     const { cuotasActivasColeccion } = await getActivePaymentsByCard(accountName)
//     console.log(cuotasActivasColeccion);
    
// }) 

// module.exports = masivePaymentsScene;