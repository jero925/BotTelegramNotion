// const { Scenes } = require('telegraf');

// const { getCreditCardList } = require('../../notion/notion_functions')

// // const accountsListScene = new Scenes.BaseScene('ACCOUNT_LIST_SCENE');
// accountsListScene.enter(async (ctx) => {
//     const { accountsList, accountsData } = await getCreditCardList()
//     ctx.state.accountsData = accountsData;
//     await ctx.reply(`Cuentas:\n${accountsList}`);
//     return ctx.scene.enter('MASSIVE_PAYMENTS')
// }) 

// module.exports = accountsListScene;