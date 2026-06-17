package com.example.itv_app.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
public class Vehiculo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String matricula;
    @Column(unique = true)
    private String matriculaNormalizada;
    private String marca;
    private String modelo;
    private LocalDate fechaUltimaItv;
    private LocalDate fechaProximaItv;
    private String documentoItvNombre;
    private String documentoItvTipo;

    @Lob
    @JsonIgnore
    private byte[] documentoItv;

    @OneToMany(mappedBy = "vehiculo", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("fechaItv DESC")
    private List<HistorialItv> historialItv = new ArrayList<>();

    public Long getId() { return id; }

    public String getMatricula() { return matricula; }
    public void setMatricula(String matricula) { this.matricula = matricula; }

    public String getMatriculaNormalizada() { return matriculaNormalizada; }
    public void setMatriculaNormalizada(String matriculaNormalizada) { this.matriculaNormalizada = matriculaNormalizada; }

    public String getMarca() { return marca; }
    public void setMarca(String marca) { this.marca = marca; }

    public String getModelo() { return modelo; }
    public void setModelo(String modelo) { this.modelo = modelo; }

    public LocalDate getFechaUltimaItv() { return fechaUltimaItv; }
    public void setFechaUltimaItv(LocalDate fechaUltimaItv) { this.fechaUltimaItv = fechaUltimaItv; }

    public LocalDate getFechaProximaItv() { return fechaProximaItv; }
    public void setFechaProximaItv(LocalDate fechaProximaItv) { this.fechaProximaItv = fechaProximaItv; }

    public String getDocumentoItvNombre() { return documentoItvNombre; }
    public void setDocumentoItvNombre(String documentoItvNombre) { this.documentoItvNombre = documentoItvNombre; }

    public String getDocumentoItvTipo() { return documentoItvTipo; }
    public void setDocumentoItvTipo(String documentoItvTipo) { this.documentoItvTipo = documentoItvTipo; }

    public byte[] getDocumentoItv() { return documentoItv; }
    public void setDocumentoItv(byte[] documentoItv) { this.documentoItv = documentoItv; }

    public List<HistorialItv> getHistorialItv() { return historialItv; }
    public void setHistorialItv(List<HistorialItv> historialItv) { this.historialItv = historialItv; }

    public void agregarHistorial(LocalDate fechaItv, LocalDate fechaProximaItv) {
        HistorialItv historial = new HistorialItv();
        historial.setVehiculo(this);
        historial.setFechaItv(fechaItv);
        historial.setFechaProximaItv(fechaProximaItv);
        historialItv.add(historial);
    }
}
