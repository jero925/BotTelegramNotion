import { NotionPageFactory } from '../class/notion-page-factory.js';
import dbOptions from '../config/databases.js';
import { movementTypeIOOptions } from '../config/movements.js';

export async function createNewMovement(properties) {
    const pageFactory = new NotionPageFactory(dbOptions.dbFlujoPlata);

    pageFactory
        .setIcon(properties.movimientoImagen)
        .setTitle('Nombre', properties.movimientoNombre)
        .setDate('Fecha', properties.movimientoFechaActual)
        .setRelation('Producto en cuotas', properties.movimientoCuotaId)
        .setRelation('Cuenta', properties.movimientoCuentaId)
        .setMultiSelect('Tipo', properties.movimientoTipoNombre)
        .setSelect('I/O', properties.movimientoTipoIO)
        .setStatus('Estado Suscripcion', 'No sub')
        .setRelation('Ingreso. Mes Año', properties.movimientoTipoIO === movementTypeIOOptions.Ingreso ? properties.movimientoMesActualId : null)
        .setNumber('Monto', properties.movimientoTipoIO === movementTypeIOOptions.Gasto ? -properties.movimientoMonto : properties.movimientoMonto)
        .setRelation('Gasto. Mes Año', properties.movimientoTipoIO === movementTypeIOOptions.Gasto ? properties.movimientoMesActualId : null)

    const pageProperties = pageFactory.build();

    await pageFactory.create(pageProperties.content);
}

export async function updateMovement(movementId, properties) {
    const pageFactory = new NotionPageFactory(dbOptions.dbFlujoPlata)
        .setIcon(properties.movimientoImagen)
        .setTitle('Nombre', properties.movimientoNombre)
        .setDate('Fecha', properties.movimientoFechaActual)
        .setRelation('Producto en cuotas', properties.movimientoCuotaId)
        .setRelation('Cuenta', properties.movimientoCuentaId)
        .setMultiSelect('Tipo', properties.movimientoTipoNombre)
        .setSelect('I/O', properties.movimientoTipoIO)
        .setStatus('Estado Suscripcion', 'No sub')
        .setRelation('Ingreso. Mes Año', properties.movimientoTipoIO === movementTypeIOOptions.Ingreso ? properties.movimientoMesActualId : null)
        .setNumber('Monto', properties.movimientoTipoIO === movementTypeIOOptions.Gasto ? -properties.movimientoMonto : properties.movimientoMonto)
        .setRelation('Gasto. Mes Año', properties.movimientoTipoIO === movementTypeIOOptions.Gasto ? properties.movimientoMesActualId : null);

    const pageProperties = pageFactory.build();
    
    await pageFactory.create(pageProperties.content);
}