import {createSign} from "node:crypto";
type Credentials={client_email:string;private_key:string;token_uri?:string};
export function required(name:string):string {
 const value=process.env[name];
 if(!value)throw new Error("Missing required deployment secret: "+name);
 return value;
}
function encode(input:unknown):string{return Buffer.from(JSON.stringify(input)).toString("base64url");}
export async function googleToken():Promise<string>{
 const raw=required("GOOGLE_SERVICE_ACCOUNT_JSON");
 const credential=JSON.parse(raw) as Credentials;
 if(!credential.client_email||!credential.private_key)throw new Error("Service account missing email or key");
 const endpoint=credential.token_uri??"https://oauth2.googleapis.com/token";
 const now=Math.floor(Date.now()/1000);
 const payload=encode({iss:credential.client_email,scope:"https://www.googleapis.com/auth/spreadsheets.readonly",aud:endpoint,iat:now,exp:now+3600});
 const data=encode({alg:"RS256",typ:"JWT"})+"."+payload;
 const signer=createSign("RSA-SHA256");signer.update(data);signer.end();
 const jwt=data+"."+signer.sign(credential.private_key).toString("base64url");
 const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
  body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:jwt})});
 if(!response.ok)throw new Error("Google service account token unavailable: "+response.status);
 const body=await response.json() as {access_token?:string};
 if(!body.access_token)throw new Error("Google access token absent");
 return body.access_token;
}
