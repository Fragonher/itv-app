package com.example.itv_app.controller;

import com.example.itv_app.model.Vehiculo;
import com.example.itv_app.repository.VehiculoRepository;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;
import java.util.Objects;
import java.util.regex.Pattern;

import static org.springframework.http.HttpStatus.*;

@RestController
@RequestMapping("/api/vehiculos")
@CrossOrigin("*")
public class VehiculoController {

    private static final Pattern MATRICULA_ACTUAL = Pattern.compile("^\\d{4}[A-Z]{3}$");
    private static final Pattern MATRICULA_ANTIGUA = Pattern.compile("^[A-Z]{1,2}\\d{4}[A-Z]{1,2}$");
    private static final Pattern MATRICULA_REMOLQUE = Pattern.compile("^R\\d{4}[A-Z]{3}$");

    private final VehiculoRepository vehiculoRepository;

    public VehiculoController(VehiculoRepository vehiculoRepository) {
        this.vehiculoRepository = vehiculoRepository;
    }

    @GetMapping
    public List<Vehiculo> listar() {
        return vehiculoRepository.findAll();
    }

    @PostMapping
    public Vehiculo crear(@RequestBody Vehiculo vehiculo) {
        prepararVehiculo(vehiculo, null);
        vehiculo.agregarHistorial(vehiculo.getFechaUltimaItv(), vehiculo.getFechaProximaItv());

        return vehiculoRepository.save(vehiculo);
    }

    @PutMapping("/{id}")
    public Vehiculo actualizar(@PathVariable Long id, @RequestBody Vehiculo datos) {
        Vehiculo vehiculo = vehiculoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Vehiculo no encontrado"));

        prepararVehiculo(datos, id);

        boolean cambianFechas = !Objects.equals(vehiculo.getFechaUltimaItv(), datos.getFechaUltimaItv())
                || !Objects.equals(vehiculo.getFechaProximaItv(), datos.getFechaProximaItv());

        vehiculo.setMatricula(datos.getMatricula());
        vehiculo.setMatriculaNormalizada(datos.getMatriculaNormalizada());
        vehiculo.setMarca(datos.getMarca());
        vehiculo.setModelo(datos.getModelo());
        vehiculo.setFechaUltimaItv(datos.getFechaUltimaItv());
        vehiculo.setFechaProximaItv(datos.getFechaProximaItv());

        if (cambianFechas) {
            vehiculo.agregarHistorial(datos.getFechaUltimaItv(), datos.getFechaProximaItv());
        }

        return vehiculoRepository.save(vehiculo);
    }

    @PostMapping("/{id}/documento")
    public Vehiculo subirDocumento(@PathVariable Long id, @RequestParam("documento") MultipartFile documento) throws IOException {
        Vehiculo vehiculo = vehiculoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Vehiculo no encontrado"));

        if (documento.isEmpty()) {
            throw new ResponseStatusException(BAD_REQUEST, "El documento no puede estar vacio");
        }

        String tipo = documento.getContentType();

        if (tipo == null || (!tipo.equals("application/pdf") && !tipo.startsWith("image/"))) {
            throw new ResponseStatusException(BAD_REQUEST, "Solo se permiten PDF o imagenes");
        }

        vehiculo.setDocumentoItvNombre(documento.getOriginalFilename());
        vehiculo.setDocumentoItvTipo(tipo);
        vehiculo.setDocumentoItv(documento.getBytes());

        return vehiculoRepository.save(vehiculo);
    }

    @GetMapping("/{id}/documento")
    public ResponseEntity<byte[]> descargarDocumento(@PathVariable Long id) {
        Vehiculo vehiculo = vehiculoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Vehiculo no encontrado"));

        if (vehiculo.getDocumentoItv() == null) {
            throw new ResponseStatusException(NOT_FOUND, "Documento no encontrado");
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(vehiculo.getDocumentoItvTipo()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + vehiculo.getDocumentoItvNombre() + "\"")
                .body(vehiculo.getDocumentoItv());
    }

    @PostMapping("/{id}/foto")
    public Vehiculo subirFoto(@PathVariable Long id, @RequestParam("foto") MultipartFile foto) throws IOException {
        Vehiculo vehiculo = vehiculoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Vehiculo no encontrado"));

        if (foto.isEmpty()) {
            throw new ResponseStatusException(BAD_REQUEST, "La foto no puede estar vacia");
        }

        String tipo = foto.getContentType();

        if (tipo == null || !tipo.startsWith("image/")) {
            throw new ResponseStatusException(BAD_REQUEST, "Solo se permiten imagenes");
        }

        vehiculo.setFotoVehiculoNombre(foto.getOriginalFilename());
        vehiculo.setFotoVehiculoTipo(tipo);
        vehiculo.setFotoVehiculo(foto.getBytes());

        return vehiculoRepository.save(vehiculo);
    }

    @GetMapping("/{id}/foto")
    public ResponseEntity<byte[]> verFoto(@PathVariable Long id) {
        Vehiculo vehiculo = vehiculoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Vehiculo no encontrado"));

        if (vehiculo.getFotoVehiculo() == null) {
            throw new ResponseStatusException(NOT_FOUND, "Foto no encontrada");
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(vehiculo.getFotoVehiculoTipo()))
                .body(vehiculo.getFotoVehiculo());
    }

    @DeleteMapping("/{id}")
    public void borrar(@PathVariable Long id) {
        vehiculoRepository.deleteById(id);
    }

    private void prepararVehiculo(Vehiculo vehiculo, Long idActual) {
        String matriculaNormalizada = normalizarMatricula(vehiculo.getMatricula());

        if (!matriculaValida(matriculaNormalizada)) {
            throw new ResponseStatusException(BAD_REQUEST, "Formato de matricula no valido. Usa 1234ABC, MU1234AB o R1732BDB");
        }

        boolean duplicada = vehiculoRepository.findAll().stream()
                .filter(v -> idActual == null || !v.getId().equals(idActual))
                .anyMatch(v -> matriculaNormalizada.equals(normalizarMatricula(v.getMatricula()))
                        || matriculaNormalizada.equals(v.getMatriculaNormalizada()));

        if (duplicada) {
            throw new ResponseStatusException(CONFLICT, "Ya existe un vehiculo con esa matricula");
        }

        vehiculo.setMatricula(matriculaNormalizada);
        vehiculo.setMatriculaNormalizada(matriculaNormalizada);
    }

    private String normalizarMatricula(String matricula) {
        return matricula == null ? "" : matricula.toUpperCase().replaceAll("[\\s-]", "");
    }

    private boolean matriculaValida(String matricula) {
        return MATRICULA_ACTUAL.matcher(matricula).matches()
                || MATRICULA_ANTIGUA.matcher(matricula).matches()
                || MATRICULA_REMOLQUE.matcher(matricula).matches();
    }
}
