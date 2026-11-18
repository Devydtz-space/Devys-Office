import {marked} from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/common';
window.OfficeMarkdown=text=>{
 const clean=DOMPurify.sanitize(marked.parse(String(text||''),{breaks:true,gfm:true}),{FORBID_TAGS:['img','iframe','style','input','form','button'],FORBID_ATTR:['style']});
 const template=document.createElement('template');template.innerHTML=clean;
 template.content.querySelectorAll('pre code').forEach(code=>{const lang=[...code.classList].find(x=>x.startsWith('language-'))?.slice(9);if(lang&&hljs.getLanguage(lang))code.innerHTML=hljs.highlight(code.textContent,{language:lang,ignoreIllegals:true}).value;const button=document.createElement('button');button.type='button';button.dataset.copyCode='';button.textContent='Copy';code.before(button);});
 template.content.querySelectorAll('a').forEach(a=>{if(!/^https:\/\//i.test(a.getAttribute('href')||''))a.removeAttribute('href');else {a.dataset.externalUrl=a.href;a.removeAttribute('href');a.setAttribute('role','link');a.tabIndex=0;}});
 return template.innerHTML;
};
