import { routines } from "@db";

export function getActualSchedule(routine: typeof routines.$inferSelect) {
    // arrancamos tratando de obtener el inicio del día en UTC
    const dayStartUTC = new Date();

    // qué hora es?????
    const now = dayStartUTC.getTime();
    dayStartUTC.setUTCHours(0, 0, 0, 0);

    // restamos el offset de la zona horaria para saber a que hora arranca el día para el usuario
    let dayStart = dayStartUTC.getTime() - routine.utcOffset * 1000;

    // como el offset puede ser negativo, puede ser que terminemos con un Date en el futuro.
    // a falta de máquinas de tiempo que nos permitan reportar actividades en el futuro: le restamos 24hrs
    if (dayStart > now) dayStart -= 24 * 60 * 60 * 1000;

    // ahora podemos saber a que hora exacta arranca cada recarga, lo guardamos como número en este array
    return {
        now,
        schedule: routine.schedule.map((t) => dayStart + t * 1000),
    };
}
