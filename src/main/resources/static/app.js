const API_URL = "/api/vehiculos";
const MATRICULA_ACTUAL = /^\d{4}[A-Z]{3}$/;
const MATRICULA_ANTIGUA = /^[A-Z]{1,2}\d{4}[A-Z]{1,2}$/;
let vehiculoEditandoId = null;
let vehiculoPasandoItvId = null;
let vehiculosCargados = [];

document.getElementById("formVehiculo").addEventListener("submit", async function (e) {
    e.preventDefault();
    ocultarMensajeFormulario();

    const matriculaNormalizada = normalizarMatricula(document.getElementById("matricula").value);

    if (!matriculaValida(matriculaNormalizada)) {
        mostrarMensajeFormulario("Formato de matr&iacute;cula no v&aacute;lido. Usa 1234ABC o MU1234AB.", true);
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

    if (documento) {
        const documentoSubido = await subirDocumentoItv(vehiculoGuardado.id, documento);

        if (!documentoSubido) {
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
registrarEvento("btnCerrarPasarItv", "click", cerrarModalPasarItv);
document.getElementById("modalPasarItv").addEventListener("click", function (e) {
    if (e.target === this) {
        cerrarModalPasarItv();
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
    filtrarVehiculosPorMatricula();
}

function mostrarVehiculos(vehiculos) {
    const tabla = document.getElementById("tablaVehiculos");
    tabla.innerHTML = "";

    if (vehiculos.length === 0) {
        const fila = document.createElement("tr");
        fila.innerHTML = `<td colspan="8" class="sin-resultados mensaje-tabla">No hay veh&iacute;culos para esa matr&iacute;cula</td>`;
        tabla.appendChild(fila);
        return;
    }

    vehiculos.forEach(v => {
        const diasItv = calcularDiasItv(v.fechaProximaItv);
        const fila = document.createElement("tr");

        fila.innerHTML = `
            <td data-label="Matr&iacute;cula" class="matricula">${v.matricula}</td>
            <td data-label="Veh&iacute;culo">${v.marca || "-"} ${v.modelo || ""}</td>
            <td data-label="&Uacute;ltima ITV">${formatearFecha(v.fechaUltimaItv)}</td>
            <td data-label="Pr&oacute;xima ITV">${formatearFecha(v.fechaProximaItv)}</td>
            <td data-label="D&iacute;as restantes" class="${diasItv.clase}">${diasItv.texto}</td>
            <td data-label="Estado"><span class="estado ${diasItv.clase}">${diasItv.estado}</span></td>
            <td data-label="Documento">${crearEnlaceDocumento(v)}</td>
            <td data-label="Acciones">
                <div class="acciones-tabla">
                    <button type="button" class="btn pasar-itv btn-pasar-itv">
                        <img src="assets/itv.png" alt="" class="icono-boton">
                        Pasar ITV
                    </button>
                    <button type="button" class="btn editar btn-editar">
                        <img src="assets/editar.png" alt="" class="icono-boton">
                        Editar
                    </button>
                    <button type="button" class="btn peligro btn-borrar">
                        <img src="assets/eliminar.png" alt="" class="icono-boton">
                        Borrar
                    </button>
                </div>
            </td>
        `;

        fila.querySelector(".btn-pasar-itv").addEventListener("click", () => abrirModalPasarItv(v));
        fila.querySelector(".btn-editar").addEventListener("click", () => editarVehiculo(v));
        fila.querySelector(".btn-borrar").addEventListener("click", () => borrarVehiculo(v));
        tabla.appendChild(fila);

        const filaHistorial = document.createElement("tr");
        filaHistorial.classList.add("fila-historial");
        filaHistorial.innerHTML = `
            <td class="historial-celda" colspan="8">
                ${crearHistorialItv(v.historialItv)}
            </td>
        `;
        tabla.appendChild(filaHistorial);
    });
}

function mostrarMensajeTabla(mensaje) {
    const tabla = document.getElementById("tablaVehiculos");
    const fila = document.createElement("tr");

    tabla.innerHTML = "";
    fila.innerHTML = `<td colspan="8" class="sin-resultados mensaje-tabla">${mensaje}</td>`;
    tabla.appendChild(fila);
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
    const vehiculosFiltrados = busqueda
        ? vehiculosCargados.filter(v => normalizarMatricula(v.matricula).includes(busqueda))
        : vehiculosCargados;

    btnLimpiarBusqueda.classList.toggle("oculto", !busqueda);
    mostrarVehiculos(vehiculosFiltrados);
}

function limpiarBusqueda() {
    document.getElementById("buscarMatricula").value = "";
    filtrarVehiculosPorMatricula();
}

function normalizarMatricula(valor) {
    return (valor || "").toUpperCase().replace(/\s|-/g, "");
}

function matriculaValida(matricula) {
    return MATRICULA_ACTUAL.test(matricula) || MATRICULA_ANTIGUA.test(matricula);
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

function editarVehiculo(vehiculo) {
    vehiculoEditandoId = vehiculo.id;
    abrirFormulario();

    document.getElementById("matricula").value = vehiculo.matricula;
    document.getElementById("marca").value = vehiculo.marca || "";
    document.getElementById("modelo").value = vehiculo.modelo || "";
    document.getElementById("fechaUltimaItv").value = vehiculo.fechaUltimaItv;
    document.getElementById("fechaProximaItv").value = vehiculo.fechaProximaItv;
    document.getElementById("documentoItv").value = "";
    actualizarNombreDocumento();
    document.getElementById("btnGuardar").innerHTML = `<img src="assets/crearvehiculo.png" alt="" class="icono-boton">Actualizar veh&iacute;culo`;
}

function limpiarFormulario() {
    vehiculoEditandoId = null;

    document.getElementById("formVehiculo").reset();
    actualizarNombreDocumento();
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
    document.getElementById("modalPasarItv").classList.remove("oculto");
    document.getElementById("fechaPasarItv").focus();
}

function cerrarModalPasarItv() {
    vehiculoPasandoItvId = null;
    document.getElementById("formPasarItv").reset();
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

    cerrarModalPasarItv();
    cargarVehiculos();
}

function actualizarNombreDocumento() {
    const documento = document.getElementById("documentoItv").files[0];
    document.getElementById("nombreDocumentoItv").textContent = documento
        ? documento.name
        : "Ning\u00fan archivo seleccionado";
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
