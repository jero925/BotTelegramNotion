# Bot de Telegram para Gestión Financiera

Este bot de Telegram permite gestionar ingresos, gastos y productos en cuotas, integrado con una base de datos en Notion para el seguimiento financiero.

## Instalación

1. Clona este repositorio:
    ```bash
    git clone https://github.com/jero925/BotTelegramNotion
    ```

2. Instala las dependencias:
    ```bash
    npm install
    ```

3. Crea un archivo `.env` en la raíz del proyecto y agrega las siguientes variables de entorno:

    ```plaintext
    BOT_TOKEN=your_bot_token_here
    NOTION_API_KEY=your_notion_api_key_here
    CALENDARIO_DB_ID=your_calendario_database_id_here
    MET_PAGO_DB_ID=your_met_pago_database_id_here
    MESES_DB_ID=your_meses_database_id_here
    FLUJOPLATA_DB_ID=your_flujoplata_database_id_here
    CUOTAS_DB_ID=your_cuotas_database_id_here
    VIAJES_DB_ID=your_viajes_database_id_here
    GASTOS_VIAJES_DB_ID=your_gastos_viajes_database_id_here
    ```

   Asegúrate de reemplazar `your_bot_token_here` y las otras IDs de base de datos con tus propias credenciales.

## Uso

Para ejecutar el bot, utiliza el siguiente comando:
```bash
npm start
