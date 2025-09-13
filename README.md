[readme_preparapau.md](https://github.com/user-attachments/files/22311919/readme_preparapau.md)
# Calculadora de Probabilidad y Estadística - PreparaPAU

Una calculadora web interactiva para cálculos de probabilidad y estadística, diseñada especialmente para estudiantes que se preparan para la Prueba de Acceso a la Universidad (PAU) en España.

## Características

### 🎯 Distribución Binomial
- Cálculo de probabilidades exactas P(X = k)
- Probabilidades acumulativas P(X ≤ k) y P(X ≥ k)
- Probabilidades en intervalos P(a ≤ X ≤ b)
- Cálculo automático de media, varianza y desviación típica
- Visualización gráfica de la distribución
- Ejemplos predefinidos (monedas, dados, productos defectuosos, exámenes)

### 📈 Distribución Normal
- Cálculo de probabilidades P(X ≤ x) y P(X ≥ x)
- Probabilidades en intervalos P(a ≤ X ≤ b)
- Estandarización automática (puntuaciones z)
- Gráfico interactivo con marcadores de media y desviación típica
- Ejemplos predefinidos (alturas, pesos, notas, tiempos)

### 📊 Estadística Descriptiva
- Cálculo de medidas de tendencia central (media, mediana, moda)
- Medidas de dispersión (varianza, desviación típica)
- Histograma de frecuencias con marcadores estadísticos
- Análisis automático de datos introducidos
- Ejemplos predefinidos para diferentes contextos

## Funcionalidades Adicionales

- **Pasos detallados**: Muestra el proceso de cálculo paso a paso
- **Validación de condiciones**: Verifica automáticamente las condiciones de aplicabilidad
- **Exportación de resultados**: Copia al portapapeles y descarga en formato texto
- **Descarga de gráficos**: Exporta las visualizaciones como archivos PNG
- **Persistencia de datos**: Guarda automáticamente el estado de la aplicación
- **Interfaz responsive**: Optimizada para dispositivos móviles y escritorio

## Uso

### Instalación
1. Clona el repositorio o descarga los archivos
2. Abre `probabilidad.html` en tu navegador web
3. No requiere instalación de dependencias adicionales

### Estructura de archivos
```
├── probabilidad.html    # Página principal
├── styles.css          # Estilos CSS
├── script.js           # Lógica JavaScript
└── README.md           # Este archivo
```

### Navegación
- **Pestañas superiores**: Cambia entre Binomial, Normal y Estadística Descriptiva
- **Ejemplos rápidos**: Botones para cargar casos de uso típicos
- **Selector de tipo**: Elige el tipo de probabilidad a calcular
- **Mostrar pasos**: Toggle para ver/ocultar el proceso de cálculo

## Dependencias

- **Chart.js**: Para la generación de gráficos interactivos (cargado desde CDN)
- **Google Fonts**: Fuente Lato para una mejor tipografía

## Implementación Técnica

### Algoritmos matemáticos
- **Binomial**: Uso de logaritmos para evitar overflow en cálculos factoriales
- **Normal**: Implementación de la función error (erf) para CDF precisa
- **Estadística**: Algoritmos eficientes para medidas descriptivas

### Características del código
- Código JavaScript modular y bien documentado
- Manejo de estados con localStorage para persistencia
- Validación robusta de entrada de datos
- Optimización para rendimiento en cálculos intensivos

## Casos de Uso

### Estudiantes de Bachillerato
- Preparación para exámenes de matemáticas aplicadas
- Resolución de problemas de probabilidad y estadística
- Verificación de resultados de ejercicios

### Profesores
- Herramienta didáctica para explicar conceptos
- Generación rápida de ejemplos y visualizaciones
- Verificación de soluciones de problemas

## Navegadores Compatibles

- Chrome/Chromium 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Limitaciones Conocidas

- La aproximación normal a la binomial se recomienda cuando np ≥ 5 y nq ≥ 5
- Los cálculos binomiales pueden ser lentos para valores muy grandes de n (>1000)
- La precisión de la función error está limitada a aproximaciones numéricas

## Contribuciones

El proyecto está diseñado como una herramienta educativa autónoma. Para mejoras o correcciones:

1. Identifica el problema o mejora deseada
2. Modifica los archivos correspondientes
3. Prueba thoroughly en diferentes navegadores
4. Documenta los cambios realizados

## Licencia

Proyecto educativo de uso libre para fines académicos.

---

**Nota**: Esta calculadora está diseñada con fines educativos y de preparación académica. Para aplicaciones profesionales o de investigación, se recomienda verificar los resultados con software estadístico especializado.
