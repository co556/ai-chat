// ==================== STORAGE ====================
const LS={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch{return d}},set(k,v){localStorage.setItem(k,JSON.stringify(v))}};
let characters=LS.get('aichat_characters',[]);
let chats=LS.get('aichat_chats',[]);
let groupChats=LS.get('aichat_groupchats',[]);
let settings=LS.get('aichat_settings',{apiKey:'',apiBase:'https://api.deepseek.com',defaultModel:'deepseek-chat'});
function saveAll(){LS.set('aichat_characters',characters);LS.set('aichat_chats',chats);LS.set('aichat_groupchats',groupChats);LS.set('aichat_settings',settings)}

// ==================== HELPERS ====================
function genId(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
const modelLabels={'deepseek-chat':'DeepSeek Chat','deepseek-reasoner':'DeepSeek Reasoner'};

// 头像：DiceBear生成或自定义URL
function getAvatarUrl(ch){
if(!ch)return'';
if(ch.avatarStyle==='custom'&&ch.customAvatar)return ch.customAvatar;
const style=ch.avatarStyle||'adventurer';
const seed=encodeURIComponent(ch.name||'ai');
return'https://api.dicebear.com/9.x/'+style+'/svg?seed='+seed+'&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf';
}
function avatarImg(ch,cls){
const url=getAvatarUrl(ch);
if(!url)return ch&&ch.emoji?ch.emoji:'🤖';
return'<img class="'+cls+'" src="'+url+'" alt="'+(ch?ch.name:'AI')+'" onerror="this.outerHTML=\''+(ch&&ch.emoji?ch.emoji:'🤖')+'\'" crossorigin="anonymous">';
}

function updateAvatarPreview(){
const style=document.getElementById('cfAvatarStyle').value;
const customWrap=document.getElementById('cfCustomWrap');
customWrap.style.display=style==='custom'?'block':'none';
const name=document.getElementById('cfName').value||'ai';
const preview=document.getElementById('cfAvatarPreview');
if(style==='custom'){
const url=document.getElementById('cfCustomAvatar').value;
preview.src=url||'';
preview.style.display=url?'block':'none';
}else{
preview.src='https://api.dicebear.com/9.x/'+style+'/svg?seed='+encodeURIComponent(name)+'&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf';
preview.style.display='block';
}
}
document.getElementById('cfName').addEventListener('input',updateAvatarPreview);

// 图片上传：压缩并转base64
function handleAvatarUpload(input){
const file=input.files[0];if(!file)return;
const reader=new FileReader();
reader.onload=function(e){
const img=new Image();
img.onload=function(){
const canvas=document.createElement('canvas');
const max=200;let w=img.width,h=img.height;
if(w>h){if(w>max){h=h*max/w;w=max}}else{if(h>max){w=w*max/h;h=max}}
canvas.width=w;canvas.height=h;
canvas.getContext('2d').drawImage(img,0,0,w,h);
const dataUrl=canvas.toDataURL('image/jpeg',0.8);
document.getElementById('cfCustomAvatar').value=dataUrl;
document.getElementById('cfAvatarPreview').src=dataUrl;
document.getElementById('cfAvatarPreview').style.display='block';
};
img.src=e.target.result;
};
reader.readAsDataURL(file);
}

// ==================== SIDEBAR ====================
function openSidebar(){document.getElementById('sidebar').classList.add('open');document.getElementById('sidebarOverlay').classList.add('active')}
function closeSidebar(){document.getElementById('sidebar').classList.remove('open');document.getElementById('sidebarOverlay').classList.remove('active')}

// ==================== ROUTER ====================
let currentRoute='';
function navigateTo(hash){window.location.hash=hash;closeSidebar()}
function handleRoute(){
const hash=window.location.hash||'#/';currentRoute=hash;
document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
const parts=hash.replace('#/','').split('/');
const base=parts[0];const id=parts[1];
updateNavActive(base);
switch(base){
case'':showHome();document.getElementById('page-home').classList.add('active');document.getElementById('topTitle').textContent='AI Chat Pro';break;
case'characters':if(id==='new'){showCharacterEditor();document.getElementById('page-character-editor').classList.add('active');document.getElementById('topTitle').textContent='新建角色'}else if(id){editCharacter(id);document.getElementById('page-character-editor').classList.add('active');document.getElementById('topTitle').textContent='编辑角色'}else{showCharacterList();document.getElementById('page-characters').classList.add('active');document.getElementById('topTitle').textContent='角色管理'}break;
case'chat':if(id){showChat(id);document.getElementById('page-chat').classList.add('active');const ct=chats.find(c=>c.id===id);const ch=ct?characters.find(c=>c.id===ct.charId):null;document.getElementById('topTitle').textContent=ch?ch.name:'对话'}break;
case'group':if(id){showGroupChat(id);document.getElementById('page-group-chat').classList.add('active');const g=groupChats.find(x=>x.id===id);document.getElementById('topTitle').textContent=g?g.name:'群聊'}else{showGroupList();document.getElementById('page-group-list').classList.add('active');document.getElementById('topTitle').textContent='群聊大厅'}break;
case'settings':showSettings();document.getElementById('page-settings').classList.add('active');document.getElementById('topTitle').textContent='设置';break;
default:showHome();document.getElementById('page-home').classList.add('active');document.getElementById('topTitle').textContent='AI Chat Pro';
}renderSidebar();
}
window.addEventListener('hashchange',handleRoute);
function updateNavActive(base){
document.querySelectorAll('.bn-item').forEach(n=>n.classList.remove('active'));
document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
const map={'':'0','characters':'1','group':'2','settings':'3'};
const idx=map[base];
if(idx!==undefined)document.querySelectorAll('.bn-item')[parseInt(idx)]?.classList.add('active');
document.querySelectorAll('.nav-item').forEach(n=>{if(n.getAttribute('href')==='#/'+base)n.classList.add('active')});
}

// ==================== SIDEBAR CHATS ====================
function renderSidebar(){
const container=document.getElementById('recentChats');if(!container)return;
const all=chats.filter(c=>c.messages&&c.messages.length>0).sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,15);
container.innerHTML=all.length?all.map(c=>{const ch=characters.find(x=>x.id===c.charId);return'<div class="recent-chat-item" onclick="navigateTo(\'#/chat/'+c.id+'\')"><span class="rc-avatar">'+avatarImg(ch,'avatar-inline')+'</span><div class="rc-info"><div class="rc-name">'+(ch?ch.name:'AI')+'</div><div class="rc-preview">'+c.title+'</div></div></div>'}).join(''):'<div style="padding:12px;color:var(--text3);font-size:12px">暂无聊天记录</div>';
}

// ==================== HOME ====================
function showHome(){
const grid=document.getElementById('homeCharGrid');
if(characters.length===0){grid.innerHTML='<p class="empty-text">还没有角色，<a href="#/characters/new" style="color:var(--accent)">创建一个</a>吧</p>';return}
grid.innerHTML=characters.map(c=>'<div class="char-card" onclick="startOrResumeChat(\''+c.id+'\')">'+avatarImg(c,'card-avatar')+'<div class="cc-name">'+c.name+'</div><div class="cc-desc">'+c.personality.slice(0,40)+'...</div></div>').join('');
}
function startOrResumeChat(charId){
const existing=chats.find(c=>c.charId===charId);
if(existing){navigateTo('#/chat/'+existing.id)}
else{const id=genId();chats.push({id,charId,title:'新对话',messages:[],createdAt:Date.now(),updatedAt:Date.now()});saveAll();navigateTo('#/chat/'+id)}
}

// ==================== CHARACTERS ====================
function showCharacterList(){
const grid=document.getElementById('charGrid');
if(characters.length===0){grid.innerHTML='<p class="empty-text">还没有角色，点击右上角创建</p>';return}
grid.innerHTML=characters.map(c=>'<div class="char-card">'+avatarImg(c,'card-avatar')+'<div class="cc-name">'+c.name+'</div><div class="cc-desc">'+c.personality.slice(0,50)+'</div><div class="cc-actions"><button class="cc-btn" onclick="editCharacter(\''+c.id+'\')">编辑</button><button class="cc-btn" onclick="startOrResumeChat(\''+c.id+'\')">聊天</button><button class="cc-btn danger" onclick="deleteCharacter(\''+c.id+'\')">删除</button></div></div>').join('');
}
function showCharacterEditor(){
document.getElementById('editorTitle').textContent='新建角色';document.getElementById('cfId').value='';
document.getElementById('cfName').value='';document.getElementById('cfAvatarStyle').value='adventurer';
document.getElementById('cfCustomAvatar').value='';document.getElementById('cfCustomFile').value='';
document.getElementById('cfCustomWrap').style.display='none';
document.getElementById('cfPersonality').value='';document.getElementById('cfBackstory').value='';
document.getElementById('cfMemory').value='';document.getElementById('cfStyle').value='balanced';
document.getElementById('cfModel').value=settings.defaultModel||'deepseek-chat';
document.getElementById('cfTemp').value='1';document.getElementById('tempVal').textContent='1.0';
updateAvatarPreview();
}
function editCharacter(id){
const c=characters.find(x=>x.id===id);if(!c)return;navigateTo('#/characters/'+id);
document.getElementById('editorTitle').textContent='编辑角色';document.getElementById('cfId').value=c.id;
document.getElementById('cfName').value=c.name;document.getElementById('cfAvatarStyle').value=c.avatarStyle||'adventurer';
document.getElementById('cfCustomAvatar').value=c.customAvatar||'';document.getElementById('cfCustomFile').value='';
document.getElementById('cfCustomWrap').style.display=c.avatarStyle==='custom'?'block':'none';updateAvatarPreview();
document.getElementById('cfPersonality').value=c.personality;document.getElementById('cfBackstory').value=c.backstory||'';
document.getElementById('cfMemory').value=c.memory||'';document.getElementById('cfStyle').value=c.style||'balanced';
document.getElementById('cfModel').value=c.model||settings.defaultModel;
document.getElementById('cfTemp').value=c.temp||1;document.getElementById('tempVal').textContent=c.temp||'1.0';
updateAvatarPreview();
}
function deleteCharacter(id){if(!confirm('确定删除这个角色吗？相关聊天也会被删除。'))return;characters=characters.filter(c=>c.id!==id);chats=chats.filter(c=>c.charId!==id);saveAll();handleRoute()}
document.getElementById('charForm').addEventListener('submit',function(e){
e.preventDefault();const id=document.getElementById('cfId').value;
const data={name:document.getElementById('cfName').value.trim(),avatarStyle:document.getElementById('cfAvatarStyle').value,customAvatar:document.getElementById('cfCustomAvatar').value.trim(),personality:document.getElementById('cfPersonality').value.trim(),backstory:document.getElementById('cfBackstory').value.trim(),memory:document.getElementById('cfMemory').value.trim(),style:document.getElementById('cfStyle').value,model:document.getElementById('cfModel').value,temp:parseFloat(document.getElementById('cfTemp').value)};
if(!data.name||!data.personality){alert('请至少填写名称和性格描述');return}
if(id){const idx=characters.findIndex(c=>c.id===id);if(idx>=0)characters[idx]={...characters[idx],...data}}
else{characters.push({id:genId(),...data,createdAt:Date.now()})}
saveAll();navigateTo('#/characters');
});

// ==================== CHAT ====================
let currentChatId=null,isGenerating=false;
function showChat(chatId){
currentChatId=chatId;const chat=chats.find(c=>c.id===chatId);
if(!chat){navigateTo('#/');return}
const ch=characters.find(c=>c.id===chat.charId);if(!ch){navigateTo('#/');return}
document.getElementById('chatAvatar').innerHTML=avatarImg(ch,'avatar-inline');
document.getElementById('chatName').textContent=ch.name;
document.getElementById('chatModel').textContent=modelLabels[ch.model]||ch.model;
renderChatMessages(chat,ch);
}
function renderChatMessages(chat,ch){
const container=document.getElementById('chatMessages');
if(!chat.messages||chat.messages.length===0){container.innerHTML='<div class="chat-empty"><div class="chat-empty-icon">💬</div><div>开始和'+ch.name+'对话吧</div></div>';return}
container.innerHTML=chat.messages.map((m,i)=>'<div class="msg-row '+m.role+'"><div class="msg-avatar">'+(m.role==='user'?'<span style="font-size:28px">😎</span>':avatarImg(ch,'msg-avatar-img'))+'</div><div><div class="msg-bubble">'+escapeHtml(m.content)+'</div>'+(m.edited?'<div class="msg-edited">已编辑</div>':'')+(m.role==='assistant'?'<div class="msg-actions"><button onclick="openEditModal('+i+')">编辑</button><button onclick="regenerateAt('+i+')">重新生成</button></div>':'')+'</div></div>').join('');
container.scrollTop=container.scrollHeight;
}
function escapeHtml(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}

async function sendChatMessage(){
if(isGenerating)return;const input=document.getElementById('chatInput');const text=input.value.trim();if(!text)return;
const chat=chats.find(c=>c.id===currentChatId);if(!chat)return;const ch=characters.find(c=>c.id===chat.charId);if(!ch)return;
input.value='';input.style.height='auto';chat.messages.push({role:'user',content:text});chat.updatedAt=Date.now();
if(chat.title==='新对话')chat.title=text.slice(0,30);saveAll();renderChatMessages(chat,ch);
const container=document.getElementById('chatMessages');
const typingEl=document.createElement('div');typingEl.className='msg-row assistant';typingEl.innerHTML='<div class="msg-avatar">'+avatarImg(ch,'msg-avatar-img')+'</div><div class="msg-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>';
container.appendChild(typingEl);container.scrollTop=container.scrollHeight;isGenerating=true;
try{const response=await callAI(ch,chat.messages);typingEl.remove();chat.messages.push({role:'assistant',content:response});chat.updatedAt=Date.now();saveAll();renderChatMessages(chat,ch);renderSidebar()}
catch(e){typingEl.remove();chat.messages.push({role:'assistant',content:'[错误] '+e.message});saveAll();renderChatMessages(chat,ch)}
isGenerating=false;
}
function handleChatKey(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChatMessage()}}
async function regenerateAt(index){
if(isGenerating)return;const chat=chats.find(c=>c.id===currentChatId);if(!chat)return;const ch=characters.find(c=>c.id===chat.charId);if(!ch)return;
chat.messages=chat.messages.slice(0,index);saveAll();renderChatMessages(chat,ch);
const container=document.getElementById('chatMessages');const typingEl=document.createElement('div');
typingEl.className='msg-row assistant';typingEl.innerHTML='<div class="msg-avatar">'+avatarImg(ch,'msg-avatar-img')+'</div><div class="msg-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>';
container.appendChild(typingEl);container.scrollTop=container.scrollHeight;isGenerating=true;
try{const response=await callAI(ch,chat.messages);typingEl.remove();chat.messages.push({role:'assistant',content:response});chat.updatedAt=Date.now();saveAll();renderChatMessages(chat,ch)}
catch(e){typingEl.remove();chat.messages.push({role:'assistant',content:'[错误] '+e.message});saveAll();renderChatMessages(chat,ch)}
isGenerating=false;
}
async function regenerateLast(){const chat=chats.find(c=>c.id===currentChatId);if(!chat||chat.messages.length===0)return;const last=chat.messages[chat.messages.length-1];if(last.role!=='assistant')return;await regenerateAt(chat.messages.length-1)}
function clearCurrentChat(){if(!confirm('确定清空当前对话吗？'))return;const chat=chats.find(c=>c.id===currentChatId);if(!chat)return;chat.messages=[];chat.title='新对话';saveAll();handleRoute()}

// ==================== MESSAGE EDITING ====================
let editingMsgIndex=null;
function openEditModal(index){editingMsgIndex=index;const chat=chats.find(c=>c.id===currentChatId);if(!chat||!chat.messages[index])return;document.getElementById('editMsgText').value=chat.messages[index].content;document.getElementById('editModal').classList.add('active')}
function closeEditModal(){document.getElementById('editModal').classList.remove('active');editingMsgIndex=null;editingGroupMsg=null}
function saveEditedMessage(){
if(editingGroupMsg){
const g=groupChats.find(x=>x.id===editingGroupMsg.gid);if(g&&g.messages[editingGroupMsg.midx]){const newText=document.getElementById('editMsgText').value.trim();if(!newText)return;const msg=g.messages[editingGroupMsg.midx];msg.original=msg.content;msg.content=newText;msg.edited=true;g.messages=g.messages.slice(0,editingGroupMsg.midx+1);g.updatedAt=Date.now();saveAll();closeEditModal();renderGroupMessages(g);editingGroupMsg=null}
return;
}
const chat=chats.find(c=>c.id===currentChatId);if(!chat||editingMsgIndex===null)return;const newText=document.getElementById('editMsgText').value.trim();if(!newText)return;const msg=chat.messages[editingMsgIndex];msg.original=msg.content;msg.content=newText;msg.edited=true;chat.messages=chat.messages.slice(0,editingMsgIndex+1);chat.updatedAt=Date.now();saveAll();closeEditModal();const ch=characters.find(c=>c.id===chat.charId);renderChatMessages(chat,ch);
}

// ==================== GROUP CHAT ====================
let currentGroupId=null,editingGroupMsg=null;
function showGroupList(){
const container=document.getElementById('groupList');
if(groupChats.length===0){container.innerHTML='<p class="empty-text">还没有群聊，创建一个吧</p>';return}
container.innerHTML=groupChats.map(g=>{const members=g.charIds.map(id=>characters.find(c=>c.id===id)).filter(Boolean);return'<div class="group-item" onclick="navigateTo(\'#/group/'+g.id+'\')"><div class="gi-avatars">'+members.map(m=>avatarImg(m,'avatar-inline')).join('')+'</div><div class="gi-info"><div class="gi-name">'+g.name+'</div><div class="gi-members">'+members.map(m=>m.name).join('、')+'</div></div><button class="cc-btn danger" onclick="event.stopPropagation();deleteGroupChat(\''+g.id+'\')">删除</button></div>'}).join('');
}
function showNewGroupModal(){const list=document.getElementById('ngCharList');list.innerHTML=characters.map(c=>'<label class="cb-item"><input type="checkbox" value="'+c.id+'"><span>'+c.emoji+' '+c.name+'</span></label>').join('');list.querySelectorAll('.cb-item').forEach(el=>{el.addEventListener('click',function(e){e.preventDefault();this.classList.toggle('checked');const cb=this.querySelector('input');cb.checked=!cb.checked})});document.getElementById('ngName').value='';document.getElementById('newGroupModal').classList.add('active')}
function closeNewGroupModal(){document.getElementById('newGroupModal').classList.remove('active')}
function createGroupChat(){const name=document.getElementById('ngName').value.trim()||'新群聊';const checked=[...document.querySelectorAll('#ngCharList input:checked')].map(cb=>cb.value);if(checked.length<2){alert('请至少选择2个角色');return}if(checked.length>5){alert('最多选择5个角色');return}const g={id:genId(),name,charIds:checked,messages:[],createdAt:Date.now(),updatedAt:Date.now()};groupChats.push(g);saveAll();closeNewGroupModal();navigateTo('#/group/'+g.id)}
function deleteGroupChat(id){if(!confirm('确定删除？'))return;groupChats=groupChats.filter(g=>g.id!==id);saveAll();showGroupList()}
function showGroupChat(id){currentGroupId=id;const g=groupChats.find(x=>x.id===id);if(!g)return;const members=g.charIds.map(cid=>characters.find(c=>c.id===cid)).filter(Boolean);document.getElementById('groupChatName').textContent=g.name;document.getElementById('groupChatMembers').textContent=members.map(m=>m.name).join('、');renderGroupMessages(g)}
function renderGroupMessages(g){
const container=document.getElementById('groupChatMessages');if(!container)return;
if(!g.messages||g.messages.length===0){container.innerHTML='<div class="chat-empty"><div class="chat-empty-icon">👥</div><div>群聊开始！发言让AI们加入讨论</div></div>';return}
container.innerHTML=g.messages.map((m,i)=>{if(m.role==='user'){return'<div class="msg-row user"><div class="msg-avatar"><span style="font-size:28px">😎</span></div><div><div class="msg-bubble">'+escapeHtml(m.content)+'</div></div></div>'}else{const ch=characters.find(c=>c.id===m.charId);return'<div class="msg-row assistant"><div class="msg-avatar">'+avatarImg(ch,'msg-avatar-img')+'</div><div><div class="msg-bubble"><b style="color:var(--accent)">'+(ch?ch.name:'AI')+'</b>\n'+escapeHtml(m.content)+'</div>'+(m.edited?'<div class="msg-edited">已编辑</div>':'')+'<div class="msg-actions"><button onclick="openGroupEditModal(\''+g.id+'\','+i+')">编辑</button></div></div></div>'}}).join('');
container.scrollTop=container.scrollHeight;
}
async function sendGroupMessage(){
if(isGenerating)return;const input=document.getElementById('groupChatInput');const text=input.value.trim();if(!text)return;
const g=groupChats.find(x=>x.id===currentGroupId);if(!g)return;input.value='';input.style.height='auto';
g.messages.push({role:'user',content:text});g.updatedAt=Date.now();saveAll();renderGroupMessages(g);
const members=g.charIds.map(cid=>characters.find(c=>c.id===cid)).filter(Boolean);if(members.length===0)return;isGenerating=true;
for(const member of members){
if(!settings.apiKey)continue;const container=document.getElementById('groupChatMessages');
const typingEl=document.createElement('div');typingEl.className='msg-row assistant';
typingEl.innerHTML='<div class="msg-avatar">'+avatarImg(member,'msg-avatar-img')+'</div><div class="msg-bubble"><b style="color:var(--accent)">'+member.name+'</b>\n<div class="typing-dots"><span></span><span></span><span></span></div></div>';
container.appendChild(typingEl);container.scrollTop=container.scrollHeight;
try{const sysPrompt=buildSystemPrompt(member)+'\n\n你正在群聊"'+g.name+'"中。其他成员：'+members.filter(m=>m.id!==member.id).map(m=>m.name+'（'+m.personality.slice(0,30)+'）').join('、')+'。\n\n用户发了一条消息。请以'+member.name+'的身份自然地回复。如果前面的AI已经说过话了，你可以回应或补充。';
const context=g.messages.map(m=>{if(m.role==='user')return{role:'user',content:m.content};const cch=characters.find(c=>c.id===m.charId);return{role:'assistant',content:(cch?cch.name+'：':'')+m.content}});
const apiMsgs=[{role:'system',content:sysPrompt},...context];
const response=await callDeepSeek(member.model||settings.defaultModel,apiMsgs,member.temp||1);
typingEl.remove();g.messages.push({role:'assistant',charId:member.id,content:response});g.updatedAt=Date.now();saveAll();renderGroupMessages(g)}
catch(e){typingEl.remove();g.messages.push({role:'assistant',charId:member.id,content:'[错误] '+e.message});saveAll();renderGroupMessages(g)}
}isGenerating=false;
}
function handleGroupChatKey(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendGroupMessage()}}
function clearCurrentGroupChat(){if(!confirm('确定清空？'))return;const g=groupChats.find(x=>x.id===currentGroupId);if(!g)return;g.messages=[];saveAll();handleRoute()}
function openGroupEditModal(gid,midx){const g=groupChats.find(x=>x.id===gid);if(!g||!g.messages[midx])return;editingGroupMsg={gid,midx};editingMsgIndex=null;document.getElementById('editMsgText').value=g.messages[midx].content;document.getElementById('editModal').classList.add('active')}

// ==================== AI API (DeepSeek) ====================
function buildSystemPrompt(ch){
let p='你是'+ch.name+'。\n\n';
if(ch.backstory)p+='【背景设定】\n'+ch.backstory+'\n\n';
p+='【性格特征】\n'+ch.personality+'\n\n';
if(ch.memory)p+='【重要记忆（始终记住）】\n'+ch.memory+'\n\n';
p+='【规则】\n1. 保持角色，不要打破第四面墙。\n2. 用符合性格的方式说话。\n';
if(ch.style==='short')p+='3. 回复尽量简短。\n';else if(ch.style==='detailed')p+='3. 回复可以详细丰富。\n';else if(ch.style==='casual')p+='3. 像朋友聊天一样随意自然。\n';else if(ch.style==='formal')p+='3. 保持礼貌得体。\n';else p+='3. 回复长短适中。\n';
p+='4. 对话对象叫"消费大哥"，是你的朋友。\n';return p;
}
async function callAI(ch,messages){
if(!settings.apiKey)throw new Error('请先在设置中填入 DeepSeek API Key');
const sysPrompt=buildSystemPrompt(ch);
const context=messages.slice(-20).map(m=>({role:m.role,content:m.content}));
return await callDeepSeek(ch.model||settings.defaultModel,[{role:'system',content:sysPrompt},...context],ch.temp||1);
}
async function callDeepSeek(model,messages,temp=1){
const resp=await fetch((settings.apiBase||'https://api.deepseek.com')+'/v1/chat/completions',{
method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+settings.apiKey},
body:JSON.stringify({model,messages,temperature:temp,max_tokens:1024})
});
if(!resp.ok){const err=await resp.json().catch(()=>({}));throw new Error(err.error?.message||'API请求失败 ('+resp.status+')')}
const data=await resp.json();return data.choices[0].message.content;
}

// ==================== SETTINGS ====================
function showSettings(){
document.getElementById('sApiKey').value=settings.apiKey||'';
document.getElementById('sApiBase').value=settings.apiBase||'https://api.deepseek.com';
document.getElementById('sDefaultModel').value=settings.defaultModel||'deepseek-chat';
}
function saveSettings(){
settings.apiKey=document.getElementById('sApiKey').value.trim();
settings.apiBase=document.getElementById('sApiBase').value.trim()||'https://api.deepseek.com';
settings.defaultModel=document.getElementById('sDefaultModel').value;
saveAll();const status=document.getElementById('settingsStatus');
status.textContent='✅ 设置已保存';status.className='settings-status success';
setTimeout(()=>{status.className='settings-status'},2500);
}

// ==================== INIT ====================
handleRoute();
