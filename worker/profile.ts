import { z } from 'zod';
export const profileSchema=z.object({audience:z.enum(['adult','teen','child']),age:z.number().int().min(6).max(100).nullable(),country:z.string().trim().min(2).max(80),course:z.string().trim().max(100),guardianConsent:z.boolean(),aiConsent:z.boolean(),completed:z.literal(true)}).superRefine((p,c)=>{
  if(p.audience==='teen'&&(!p.age||p.age<13||p.age>17))c.addIssue({code:'custom',message:'El perfil de adolescente es para edades de 13 a 17 años.'});
  if(p.audience==='child'&&(!p.age||p.age<6||p.age>12))c.addIssue({code:'custom',message:'El perfil infantil de esta prueba es para edades de 6 a 12 años.'});
  if(p.audience==='adult'&&p.age!==null&&p.age<18)c.addIssue({code:'custom',message:'Elige el perfil correspondiente a la edad.'});
  if(p.audience!=='adult'&&!p.course.trim())c.addIssue({code:'custom',message:'Indica el curso para adaptar las fichas.'});
  if(p.audience!=='adult'&&!p.guardianConsent)c.addIssue({code:'custom',message:'El perfil necesita la autorización de madre, padre o tutor.'});
});
