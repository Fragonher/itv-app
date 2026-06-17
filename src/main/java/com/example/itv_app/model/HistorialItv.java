package com.example.itv_app.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
public class HistorialItv {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDate fechaItv;
    private LocalDate fechaProximaItv;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehiculo_id", nullable = false)
    @JsonIgnore
    private Vehiculo vehiculo;

    public Long getId() { return id; }

    public LocalDate getFechaItv() { return fechaItv; }
    public void setFechaItv(LocalDate fechaItv) { this.fechaItv = fechaItv; }

    public LocalDate getFechaProximaItv() { return fechaProximaItv; }
    public void setFechaProximaItv(LocalDate fechaProximaItv) { this.fechaProximaItv = fechaProximaItv; }

    public Vehiculo getVehiculo() { return vehiculo; }
    public void setVehiculo(Vehiculo vehiculo) { this.vehiculo = vehiculo; }
}
