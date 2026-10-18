import {pick} from './i18n';

export function reminderStatus(requested:boolean,configured:boolean,subscribed:boolean){
  if(!requested)return null;
  return configured&&subscribed
    ?pick('Aviso activo para esta actividad.','Reminder active for this activity.')
    :pick('Aviso solicitado, pendiente de activar/configurar.','Reminder requested, pending activation/setup.');
}
