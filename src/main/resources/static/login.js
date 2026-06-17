document.getElementById("formLogin").addEventListener("submit", async function (e) {
    e.preventDefault();

    const mensaje = document.getElementById("mensajeLogin");
    mensaje.classList.add("oculto");

    const respuesta = await fetch("/api/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            usuario: document.getElementById("usuario").value,
            password: document.getElementById("password").value
        })
    });

    if (!respuesta.ok) {
        mensaje.textContent = "Usuario o contrase\u00f1a incorrectos";
        mensaje.classList.remove("oculto");
        return;
    }

    window.location.href = "/";
});
