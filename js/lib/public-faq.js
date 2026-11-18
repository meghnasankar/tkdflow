/* Stateless public read of published lesson answers. It never creates an
   account client, never reads or stores a session and sends only the public
   project key, so it is safe for every visitor, including people who cannot
   have an account. Bounded: always resolves to {data,error} within `ms`.
   The transport is shared with public Community reading (public-read.js). */
import {ACCOUNTS} from '../config.js';
import {publicBase,publicRequest} from './public-read.js';

export function publicFaqEndpoint(cfg=ACCOUNTS){
 const base=publicBase(cfg);
 return base?`${base}/rest/v1/rpc/public_lesson_faq`:null;
}

export function readPublicFaq({lesson=null,search=null}={},{cfg=ACCOUNTS,fetchImpl=globalThis.fetch,ms=8000}={}){
 return publicRequest(publicFaqEndpoint(cfg),{cfg,fetchImpl,ms,method:'POST',body:{lesson_filter:lesson||null,search_text:search||null},
  messages:{unavailable:'Answers are unavailable.',failed:'Answers could not load.',timeout:'Lesson answers timed out'}});
}
