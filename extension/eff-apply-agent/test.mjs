import {JSDOM} from "jsdom";import {readFileSync} from "node:fs";import vm from "node:vm";
const dom=new JSDOM(`<!doctype html><title>College Application</title><label>First name<input name="first_name"></label><label>Email<input name="email"></label><label>Password<input name="password" type="password"></label><label>Verification code<input name="otp"></label><button type="submit">Submit</button>`,{url:"https://admissions.example.edu/apply",runScripts:"outside-only"});
let listener;dom.window.chrome={runtime:{onMessage:{addListener(fn){listener=fn;}}}};vm.runInContext(readFileSync(new URL("content.js",import.meta.url),"utf8"),dom.getInternalVMContext());
let result;listener({type:"EFF_PREVIEW_FILL",profile:{firstName:"Avery",email:"student@example.com",password:"never",otp:"123456"}},null,value=>result=value);
const input=name=>dom.window.document.querySelector(`[name="${name}"]`).value;
if(result.count!==2||input("first_name")!=="Avery"||input("email")!=="student@example.com"||input("password")||input("otp"))throw new Error("Safe autofill test failed");
if(dom.window.document.querySelector("button").dataset.effApplyAgent)throw new Error("Submit control was modified");
console.log("EFF Apply Agent safe autofill test passed");
