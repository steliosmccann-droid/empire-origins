import './firebase-config.js';
// Firebase's supported browser ES modules (network needed for first login).
const cfg=window.EMPIRE_FIREBASE_CONFIG||{};
const configured=Boolean(cfg.apiKey&&!cfg.apiKey.startsWith('PASTE_')&&cfg.projectId&&!cfg.projectId.startsWith('PASTE_')&&cfg.appId&&!cfg.appId.startsWith('PASTE_'));
const bridge={configured};
window.empireCloud=bridge;
if(configured){
 try{
  const [{initializeApp},{getAuth,setPersistence,browserLocalPersistence,onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut,sendPasswordResetEmail},{getFirestore,doc,getDoc,runTransaction,serverTimestamp}]=await Promise.all([
   import('https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js'),
   import('https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js'),
   import('https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js')
  ]);
  const app=initializeApp(cfg),auth=getAuth(app),db=getFirestore(app);
  await setPersistence(auth,browserLocalPersistence);
  bridge.register=(email,password)=>createUserWithEmailAndPassword(auth,email,password);
  bridge.login=(email,password)=>signInWithEmailAndPassword(auth,email,password);
  bridge.logout=()=>signOut(auth);
  bridge.resetPassword=email=>sendPasswordResetEmail(auth,email);
  bridge.read=async uid=>{const snap=await getDoc(doc(db,'empires',uid));return snap.exists()?{state:snap.data().state,revision:snap.data().revision||0}:null};
  bridge.write=async(uid,state,expectedRevision)=>runTransaction(db,async tx=>{
    const ref=doc(db,'empires',uid),snap=await tx.get(ref),revision=snap.exists()?(snap.data().revision||0):0;
    if(revision!==expectedRevision)throw Error('CLOUD_CONFLICT');
    const next=revision+1;
    tx.set(ref,{ownerUid:uid,revision:next,updatedAt:serverTimestamp(),state});
    return {revision:next};
  });
  onAuthStateChanged(auth,user=>window.dispatchEvent(new CustomEvent('empire-cloud-auth',{detail:{user:user?{uid:user.uid,email:user.email}:null}})));
 }catch(e){console.error('Firebase startup:',e);bridge.configured=false}
}
