const toast = document.getElementById("toast")

function showToast(message, isError = false){
    toast.innerText = message
    if(isError){
        toast.classList.add("error")
    }else{
        toast.classList.remove("error")
    }
    toast.classList.add("show")
    setTimeout(function(){
        toast.classList.remove("show")
    },3000)
}
