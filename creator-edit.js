import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getCreatorProfile, saveCreatorProfile, saveUserProfile } from "./firestore.js";

const $ = id => document.getElementById(id);

function list(value){
  return value.split(",").map(item => item.trim()).filter(Boolean).slice(0,20);
}

function setStatus(message, type=""){
  const box=$("status");
  box.textContent=message;
  box.className="status "+type;
}

function fill(profile, user){
  $("name").value=profile?.name || user.displayName || user.email?.split("@")[0] || "";
  $("location").value=profile?.location || "";
  $("role").value=profile?.role || "producer";
  $("avatarUrl").value=profile?.avatarUrl || profile?.photoURL || user.photoURL || "";
  $("coverUrl").value=profile?.coverUrl || "";
  $("bio").value=profile?.bio || "";
  $("genres").value=Array.isArray(profile?.genres) ? profile.genres.join(", ") : "";
  $("tags").value=Array.isArray(profile?.tags) ? profile.tags.join(", ") : "";
  $("instagram").value=profile?.instagram || "";
  $("tiktok").value=profile?.tiktok || "";
  $("youtube").value=profile?.youtube || "";
}

onAuthStateChanged(auth, async user => {
  if(!user){ location.href="auth.html"; return; }

  try{
    const userProfile=await getCreatorProfile(user.uid);
    fill(userProfile || {}, user);

    $("profileForm").addEventListener("submit", async event => {
      event.preventDefault();
      const save=$("saveBtn");
      save.disabled=true;
      save.textContent="Saving…";
      setStatus("Saving your public creator profile…");

      try{
        const name=$("name").value.trim();
        const data={
          name,
          location:$("location").value.trim(),
          role:"producer",
          avatarUrl:$("avatarUrl").value.trim(),
          coverUrl:$("coverUrl").value.trim(),
          bio:$("bio").value.trim(),
          genres:list($("genres").value),
          tags:list($("tags").value),
          instagram:$("instagram").value.trim(),
          tiktok:$("tiktok").value.trim(),
          youtube:$("youtube").value.trim()
        };

        await saveCreatorProfile(user.uid, data);
        await saveUserProfile(user, "producer", {
          name:data.name,
          photoURL:data.avatarUrl || user.photoURL || ""
        });

        setStatus("Profile saved successfully.", "success");
        setTimeout(() => {
          location.href="creator-profile.html?uid="+encodeURIComponent(user.uid);
        }, 600);
      }catch(error){
        console.error(error);
        setStatus("Could not save your profile. Please try again.", "error");
      }finally{
        save.disabled=false;
        save.textContent="Save Profile";
      }
    });
  }catch(error){
    console.error(error);
    setStatus("Could not load your existing profile.", "error");
  }
});