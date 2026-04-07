async function loadWorks(){

const res = await fetch("/api/getMyWork");
const data = await res.json();

const gallery = document.getElementById("workGallery");

gallery.innerHTML = "";

data.works.forEach(work=>{

const card = document.createElement("div");
card.className="card";

card.innerHTML = `
<img src="${work.imageUrl}">
<button class="deleteBtn" onclick="deleteWork('${work._id}')">Delete</button>
`;

gallery.appendChild(card);

});

}

async function uploadImage(){

const fileInput = document.getElementById("imageInput");

const formData = new FormData();

formData.append("image", fileInput.files[0]);

await fetch("/api/uploadWork",{

method:"POST",
body:formData

});

loadWorks();

}

async function deleteWork(id){

await fetch("/api/deleteWork/"+id,{
method:"DELETE"
});

loadWorks();

}

loadWorks();