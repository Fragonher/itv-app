package com.example.itv_app.repository;

import com.example.itv_app.model.Vehiculo;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VehiculoRepository extends JpaRepository<Vehiculo, Long> {
    boolean existsByMatriculaNormalizada(String matriculaNormalizada);
    boolean existsByMatriculaNormalizadaAndIdNot(String matriculaNormalizada, Long id);
}
