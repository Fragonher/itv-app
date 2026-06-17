const API_URL = "/api/vehiculos";
const MATRICULA_ACTUAL = /^\d{4}[A-Z]{3}$/;
const MATRICULA_ANTIGUA = /^[A-Z]{1,2}\d{4}[A-Z]{1,2}$/;
const MATRICULA_REMOLQUE = /^R\d{4}[A-Z]{3}$/;
let vehiculoEditandoId = null;
let vehiculoPasandoItvId = null;
let vehiculosCargados = [];
let filtroResumenActivo = "total";

document.getElementById("formVehiculo").addEventListener("submit", async function (e) {
    e.preventDefault();
    ocultarMensajeFormulario();

    const matriculaNormalizada = normalizarMatricula(document.getElementById("matricula").value);

    if (!matriculaValida(matriculaNormalizada)) {
        mostrarMensajeFormulario("Formato de matr&iacute;cula no v&aacute;lido. Usa 1234ABC, MU1234AB o R1732BDB.", true);
        return;
    }

    const matriculaDuplicada = vehiculosCargados.some(v =>
        normalizarMatricula(v.matricula) === matriculaNormalizada && v.id !== vehiculoEditandoId
    );

    if (matriculaDuplicada) {
        mostrarMensajeFormulario("Ya existe un veh&iacute;culo con esa matr&iacute;cula.", true);
        return;
    }

    const vehiculo = {
        matricula: matriculaNormalizada,
        marca: document.getElementById("marca").value.trim(),
        modelo: document.getElementById("modelo").value.trim(),
        fechaUltimaItv: document.getElementById("fechaUltimaItv").value,
        fechaProximaItv: document.getElementById("fechaProximaItv").value
    };

    const url = vehiculoEditandoId ? `${API_URL}/${vehiculoEditandoId}` : API_URL;
    const metodo = vehiculoEditandoId ? "PUT" : "POST";

    const respuesta = await fetch(url, {
        method: metodo,
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(vehiculo)
    });

    if (!respuesta.ok) {
        mostrarMensajeFormulario(await obtenerMensajeError(respuesta), true);
        return;
    }

    const vehiculoGuardado = await respuesta.json();
    const documento = document.getElementById("documentoItv").files[0];
    const foto = document.getElementById("fotoVehiculo").files[0];

    if (documento) {
        const documentoSubido = await subirDocumentoItv(vehiculoGuardado.id, documento);

        if (!documentoSubido) {
            return;
        }
    }

    if (foto) {
        const fotoSubida = await subirFotoVehiculo(vehiculoGuardado.id, foto);

        if (!fotoSubida) {
            return;
        }
    }

    limpiarFormulario();
    cargarVehiculos();
});

registrarEvento("btnCancelar", "click", limpiarFormulario);
registrarEvento("buscarMatricula", "input", filtrarVehiculosPorMatricula);
registrarEvento("btnBuscarMatricula", "click", filtrarVehiculosPorMatricula);
registrarEvento("btnLimpiarBusqueda", "click", limpiarBusqueda);
registrarEvento("documentoItv", "change", actualizarNombreDocumento);
registrarEvento("fotoVehiculo", "change", actualizarNombreFoto);
registrarEvento("fotoPasarItv", "change", actualizarNombreFotoPasarItv);
registrarEvento("btnCerrarPasarItv", "click", cerrarModalPasarItv);
registrarEvento("btnCerrarDetalleVehiculo", "click", cerrarDetalleVehiculo);
document.querySelectorAll(".tarjeta-resumen[data-filtro]").forEach(tarjeta => {
    tarjeta.addEventListener("click", () => aplicarFiltroResumen(tarjeta.dataset.filtro));
});
document.getElementById("modalPasarItv").addEventListener("click", function (e) {
    if (e.target === this) {
        cerrarModalPasarItv();
    }
});
document.getElementById("modalDetalleVehiculo").addEventListener("click", function (e) {
    if (e.target === this) {
        cerrarDetalleVehiculo();
    }
});
document.getElementById("formPasarItv").addEventListener("submit", guardarPasoItv);

function registrarEvento(id, evento, manejador) {
    const elemento = document.getElementById(id);

    if (elemento) {
        elemento.addEventListener(evento, manejador);
    }
}

async function cargarVehiculos() {
    try {
        const respuesta = await fetch(API_URL);
        vehiculosCargados = (await respuesta.json())
            .sort((a, b) => calcularDiasHastaItv(a.fechaProximaItv) - calcularDiasHastaItv(b.fechaProximaItv));
    } catch (error) {
        mostrarMensajeTabla("No se pudieron cargar los veh&iacute;culos. Revisa la conexi&oacute;n.");
        return;
    }

    actualizarResumen();
    document.getElementById("buscarMatricula").value = "";
    aplicarFiltroResumen("total");
}

function mostrarVehiculos(vehiculos) {
    const contenedor = document.getElementById("tarjetasVehiculos");
    contenedor.innerHTML = "";

    if (vehiculos.length === 0) {
        contenedor.innerHTML = `<div class="sin-resultados tarjeta-vacia">No hay veh&iacute;culos para este filtro</div>`;
        return;
    }

    vehiculos.forEach(v => {
        const diasItv = calcularDiasItv(v.fechaProximaItv);
        const tarjeta = document.createElement("button");

        tarjeta.type = "button";
        tarjeta.className = `tarjeta-vehiculo ${diasItv.clase}`;
        tarjeta.innerHTML = `
            ${crearFotoVehiculo(v)}
            <span class="matricula">${v.matricula}</span>
            <span class="modelo-tarjeta">${v.marca || ""} ${v.modelo || "-"}</span>
            <span class="estado ${diasItv.clase}">${diasItv.estado}</span>
        `;

        tarjeta.addEventListener("click", () => abrirDetalleVehiculo(v));
        contenedor.appendChild(tarjeta);
    });
}

function mostrarMensajeTabla(mensaje) {
    document.getElementById("tarjetasVehiculos").innerHTML = `<div class="sin-resultados tarjeta-vacia">${mensaje}</div>`;
}

function actualizarResumen() {
    const resumen = vehiculosCargados.reduce((total, vehiculo) => {
        const diasItv = calcularDiasItv(vehiculo.fechaProximaItv);

        total.vehiculos += 1;

        if (diasItv.estado === "Caducada") {
            total.caducadas += 1;
        } else if (diasItv.estado === "Correcta") {
            total.correctas += 1;
        } else {
            total.proximas += 1;
        }

        return total;
    }, {
        vehiculos: 0,
        caducadas: 0,
        proximas: 0,
        correctas: 0
    });

    document.getElementById("totalVehiculos").textContent = resumen.vehiculos;
    document.getElementById("itvCaducadas").textContent = resumen.caducadas;
    document.getElementById("itvProximas").textContent = resumen.proximas;
    document.getElementById("itvCorrectas").textContent = resumen.correctas;
}

function filtrarVehiculosPorMatricula() {
    const busqueda = normalizarMatricula(document.getElementById("buscarMatricula").value);
    const btnLimpiarBusqueda = document.getElementById("btnLimpiarBusqueda");
    const vehiculosPorEstado = filtrarPorResumen(vehiculosCargados);
    const vehiculosFiltrados = busqueda
        ? vehiculosPorEstado.filter(v => normalizarMatricula(v.matricula).includes(busqueda))
        : vehiculosPorEstado;

    btnLimpiarBusqueda.classList.toggle("oculto", !busqueda);
    mostrarVehiculos(vehiculosFiltrados);
}

function filtrarPorResumen(vehiculos) {
    if (filtroResumenActivo === "total") {
        return vehiculos;
    }

    return vehiculos.filter(v => {
        const diasItv = calcularDiasItv(v.fechaProximaItv);

        if (filtroResumenActivo === "caducada") {
            return diasItv.estado === "Caducada";
        }

        if (filtroResumenActivo === "correcta") {
            return diasItv.estado === "Correcta";
        }

        return diasItv.estado !== "Caducada" && diasItv.estado !== "Correcta";
    });
}

function aplicarFiltroResumen(filtro) {
    filtroResumenActivo = filtro;

    document.querySelectorAll(".tarjeta-resumen[data-filtro]").forEach(tarjeta => {
        tarjeta.classList.toggle("filtro-activo", tarjeta.dataset.filtro === filtro);
    });

    filtrarVehiculosPorMatricula();
}

function limpiarBusqueda() {
    document.getElementById("buscarMatricula").value = "";
    filtrarVehiculosPorMatricula();
}

function normalizarMatricula(valor) {
    return (valor || "").toUpperCase().replace(/\s|-/g, "");
}

function matriculaValida(matricula) {
    return MATRICULA_ACTUAL.test(matricula)
        || MATRICULA_ANTIGUA.test(matricula)
        || MATRICULA_REMOLQUE.test(matricula);
}

function calcularDiasItv(fechaProximaItv) {
    const diferenciaDias = calcularDiasHastaItv(fechaProximaItv);
    const diasAbsolutos = Math.abs(diferenciaDias);

    if (diferenciaDias < 0) {
        return {
            texto: `Caducada hace ${formatearDias(diasAbsolutos)}`,
            estado: "Caducada",
            clase: "caducada"
        };
    }

    if (diferenciaDias === 0) {
        return { texto: "Caduca hoy", estado: "Caducada", clase: "caducada" };
    }

    if (diferenciaDias < 15) {
        return {
            texto: `Faltan ${formatearDias(diferenciaDias)}`,
            estado: "Muy pr\u00f3xima",
            clase: "caducada"
        };
    }

    if (diferenciaDias < 30) {
        return {
            texto: `Faltan ${formatearDias(diferenciaDias)}`,
            estado: "Pr\u00f3xima",
            clase: "proxima"
        };
    }

    return {
        texto: `Faltan ${formatearDias(diferenciaDias)}`,
        estado: "Correcta",
        clase: "correcta"
    };
}

function calcularDiasHastaItv(fechaProximaItv) {
    const hoy = new Date();
    const fecha = crearFechaLocal(fechaProximaItv);
    const hoySinHora = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

    return Math.round((fecha - hoySinHora) / (1000 * 60 * 60 * 24));
}

function crearFechaLocal(fechaIso) {
    const [anio, mes, dia] = fechaIso.split("-").map(Number);
    return new Date(anio, mes - 1, dia);
}

function formatearDias(dias) {
    return `${dias} ${dias === 1 ? "d\u00eda" : "d\u00edas"}`;
}

function formatearFecha(fechaIso) {
    if (!fechaIso) {
        return "-";
    }

    const fecha = crearFechaLocal(fechaIso);

    return new Intl.DateTimeFormat("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }).format(fecha);
}

function crearEnlaceDocumento(vehiculo) {
    if (!vehiculo.documentoItvNombre) {
        return "<span class=\"texto-suave\">Sin documento</span>";
    }

    return `<a class="enlace-documento" href="${API_URL}/${vehiculo.id}/documento" target="_blank" rel="noopener">Ver documento</a>`;
}

function crearFotoVehiculo(vehiculo) {
    if (!vehiculo.fotoVehiculoNombre) {
        return `<span class="foto-vehiculo sin-foto">Sin foto</span>`;
    }

    return `<img class="foto-vehiculo" src="${API_URL}/${vehiculo.id}/foto" alt="Foto de ${vehiculo.matricula}">`;
}

function crearHistorialItv(historial) {
    if (!historial || historial.length === 0) {
        return `<div class="historial-itv"><strong>Historial ITV</strong><span class="texto-suave">Sin historial registrado</span></div>`;
    }

    const elementos = historial.map(item => `
        <li>
            <span>ITV: ${formatearFecha(item.fechaItv)}</span>
            <span>Pr&oacute;xima: ${formatearFecha(item.fechaProximaItv)}</span>
        </li>
    `).join("");

    return `
        <div class="historial-itv">
            <strong>Historial ITV</strong>
            <ul>${elementos}</ul>
        </div>
    `;
}

function abrirDetalleVehiculo(vehiculo) {
    const diasItv = calcularDiasItv(vehiculo.fechaProximaItv);

    document.getElementById("tituloDetalleVehiculo").textContent = vehiculo.matricula;
    document.getElementById("subtituloDetalleVehiculo").textContent = `${vehiculo.marca || ""} ${vehiculo.modelo || ""}`.trim();
    document.getElementById("contenidoDetalleVehiculo").innerHTML = `
        <div class="foto-detalle">
            ${crearFotoVehiculo(vehiculo)}
        </div>
        <div class="detalle-grid">
            <div>
                <span class="detalle-label">&Uacute;ltima ITV</span>
                <strong>${formatearFecha(vehiculo.fechaUltimaItv)}</strong>
            </div>
            <div>
                <span class="detalle-label">Pr&oacute;xima ITV</span>
                <strong>${formatearFecha(vehiculo.fechaProximaItv)}</strong>
            </div>
            <div>
                <span class="detalle-label">D&iacute;as restantes</span>
                <strong class="${diasItv.clase}">${diasItv.texto}</strong>
            </div>
            <div>
                <span class="detalle-label">Estado</span>
                <span class="estado ${diasItv.clase}">${diasItv.estado}</span>
            </div>
            <div>
                <span class="detalle-label">Documento ITV</span>
                <strong>${crearEnlaceDocumento(vehiculo)}</strong>
            </div>
        </div>
        <div class="acciones-detalle">
            <button type="button" class="btn pasar-itv" id="btnDetallePasarItv">
                <img src="assets/itv.png" alt="" class="icono-boton">
                Pasar ITV
            </button>
            <button type="button" class="btn editar" id="btnDetalleEditar">
                <img src="assets/editar.png" alt="" class="icono-boton">
                Editar
            </button>
            <button type="button" class="btn peligro" id="btnDetalleBorrar">
                <img src="assets/eliminar.png" alt="" class="icono-boton">
                Borrar
            </button>
        </div>
        ${crearHistorialItv(vehiculo.historialItv)}
    `;

    document.getElementById("btnDetallePasarItv").addEventListener("click", () => {
        cerrarDetalleVehiculo();
        abrirModalPasarItv(vehiculo);
    });
    document.getElementById("btnDetalleEditar").addEventListener("click", () => {
        cerrarDetalleVehiculo();
        editarVehiculo(vehiculo);
    });
    document.getElementById("btnDetalleBorrar").addEventListener("click", () => {
        cerrarDetalleVehiculo();
        borrarVehiculo(vehiculo);
    });

    document.getElementById("modalDetalleVehiculo").classList.remove("oculto");
}

function cerrarDetalleVehiculo() {
    document.getElementById("modalDetalleVehiculo").classList.add("oculto");
}

function editarVehiculo(vehiculo) {
    vehiculoEditandoId = vehiculo.id;
    abrirFormulario();

    document.getElementById("matricula").value = vehiculo.matricula;
    document.getElementById("marca").value = vehiculo.marca || "";
    document.getElementById("modelo").value = vehiculo.modelo || "";
    document.getElementById("fechaUltimaItv").value = vehiculo.fechaUltimaItv;
    document.getElementById("fechaProximaItv").value = vehiculo.fechaProximaItv;
    document.getElementById("documentoItv").value = "";
    document.getElementById("fotoVehiculo").value = "";
    actualizarNombreDocumento();
    actualizarNombreFoto();
    document.getElementById("btnGuardar").innerHTML = `<img src="assets/crearvehiculo.png" alt="" class="icono-boton">Actualizar veh&iacute;culo`;
}

function limpiarFormulario() {
    vehiculoEditandoId = null;

    document.getElementById("formVehiculo").reset();
    actualizarNombreDocumento();
    actualizarNombreFoto();
    document.getElementById("btnGuardar").innerHTML = `<img src="assets/crearvehiculo.png" alt="" class="icono-boton">Crear veh&iacute;culo`;
    document.getElementById("panelCrearVehiculo").classList.add("oculto");
    ocultarMensajeFormulario();
}

function abrirFormulario() {
    document.getElementById("panelCrearVehiculo").classList.remove("oculto");
    document.getElementById("matricula").focus();
}

window.abrirFormulario = abrirFormulario;

function abrirModalPasarItv(vehiculo) {
    vehiculoPasandoItvId = vehiculo.id;
    document.getElementById("matriculaPasarItv").textContent = `${vehiculo.matricula} - ${vehiculo.marca || ""} ${vehiculo.modelo || ""}`.trim();
    document.getElementById("fechaPasarItv").value = new Date().toISOString().slice(0, 10);
    document.getElementById("fechaSiguienteItv").value = vehiculo.fechaProximaItv || "";
    document.getElementById("fotoPasarItv").value = "";
    actualizarNombreFotoPasarItv();
    document.getElementById("modalPasarItv").classList.remove("oculto");
    document.getElementById("fechaPasarItv").focus();
}

function cerrarModalPasarItv() {
    vehiculoPasandoItvId = null;
    document.getElementById("formPasarItv").reset();
    actualizarNombreFotoPasarItv();
    document.getElementById("modalPasarItv").classList.add("oculto");
}

async function guardarPasoItv(e) {
    e.preventDefault();

    const vehiculo = vehiculosCargados.find(v => v.id === vehiculoPasandoItvId);

    if (!vehiculo) {
        cerrarModalPasarItv();
        return;
    }

    const datos = {
        matricula: vehiculo.matricula,
        marca: vehiculo.marca,
        modelo: vehiculo.modelo,
        fechaUltimaItv: document.getElementById("fechaPasarItv").value,
        fechaProximaItv: document.getElementById("fechaSiguienteItv").value
    };
    const fotoItv = document.getElementById("fotoPasarItv").files[0];

    const respuesta = await fetch(`${API_URL}/${vehiculo.id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(datos)
    });

    if (!respuesta.ok) {
        alert(await obtenerMensajeError(respuesta));
        return;
    }

    if (fotoItv) {
        const fotoSubida = await subirDocumentoItv(vehiculo.id, fotoItv);

        if (!fotoSubida) {
            return;
        }
    }

    cerrarModalPasarItv();
    cargarVehiculos();
}

function actualizarNombreDocumento() {
    const documento = document.getElementById("documentoItv").files[0];
    document.getElementById("nombreDocumentoItv").textContent = documento
        ? documento.name
        : "Ning\u00fan archivo seleccionado";
}

function actualizarNombreFoto() {
    const foto = document.getElementById("fotoVehiculo").files[0];
    document.getElementById("nombreFotoVehiculo").textContent = foto
        ? foto.name
        : "Ninguna foto seleccionada";
}

function actualizarNombreFotoPasarItv() {
    const foto = document.getElementById("fotoPasarItv").files[0];
    document.getElementById("nombreFotoPasarItv").textContent = foto
        ? foto.name
        : "Ninguna foto seleccionada";
}

async function subirDocumentoItv(vehiculoId, documento) {
    const datos = new FormData();
    datos.append("documento", documento);

    const respuesta = await fetch(`${API_URL}/${vehiculoId}/documento`, {
        method: "POST",
        body: datos
    });

    if (!respuesta.ok) {
        mostrarMensajeFormulario(await obtenerMensajeError(respuesta), true);
        return false;
    }

    return true;
}

async function subirFotoVehiculo(vehiculoId, foto) {
    const datos = new FormData();
    datos.append("foto", foto);

    const respuesta = await fetch(`${API_URL}/${vehiculoId}/foto`, {
        method: "POST",
        body: datos
    });

    if (!respuesta.ok) {
        mostrarMensajeFormulario(await obtenerMensajeError(respuesta), true);
        return false;
    }

    return true;
}

async function obtenerMensajeError(respuesta) {
    try {
        const error = await respuesta.json();
        return error.detail || error.message || error.title || "No se pudo guardar el veh&iacute;culo.";
    } catch (e) {
        return "No se pudo guardar el veh&iacute;culo.";
    }
}

function mostrarMensajeFormulario(mensaje, esError) {
    const elemento = document.getElementById("mensajeFormulario");

    elemento.innerHTML = mensaje;
    elemento.classList.toggle("error", esError);
    elemento.classList.remove("oculto");
}

function ocultarMensajeFormulario() {
    const elemento = document.getElementById("mensajeFormulario");

    elemento.textContent = "";
    elemento.classList.add("oculto");
    elemento.classList.remove("error");
}

async function borrarVehiculo(vehiculo) {
    const confirmado = confirm(`\u00bfSeguro que quieres borrar el veh\u00edculo ${vehiculo.matricula}?`);

    if (!confirmado) {
        return;
    }

    await fetch(`${API_URL}/${vehiculo.id}`, {
        method: "DELETE"
    });

    if (vehiculoEditandoId === vehiculo.id) {
        limpiarFormulario();
    }

    cargarVehiculos();
}

iniciarApp();

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js");
    });
}

async function iniciarApp() {
    const respuesta = await fetch("/api/session");
    const sesion = await respuesta.json();

    if (!sesion.autenticado) {
        window.location.href = "/login.html";
        return;
    }

    cargarVehiculos();
}

async function cerrarSesion() {
    await fetch("/api/logout", {
        method: "POST"
    });

    window.location.href = "/login.html";
}

window.cerrarSesion = cerrarSesion;
