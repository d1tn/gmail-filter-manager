# Gmail Filter Manager
Gmail Filter Manager es una extensión de Chrome que permite gestionar los filtros de Gmail de forma visual e intuitiva. Facilita la creación y edición de filtros de manera más rápida que la interfaz estándar de Gmail.

## ¿Qué es esta herramienta?
- Una herramienta con interfaz gráfica para crear y gestionar filtros complejos de Gmail
- Permite cambiar la prioridad de los filtros mediante arrastrar y soltar
- Exporta los filtros configurados como archivo XML e impórtalos en Gmail para aplicarlos  
  - Los filtros **no se envían a servidores externos**; se **guardan y sincronizan con tu cuenta de Google a través de la función de sincronización del navegador**
- La configuración se guarda en el navegador

## Cómo usar
### Crear un nuevo filtro
1. Haz clic en el botón “＋” del panel izquierdo
2. En el panel derecho configura:
   - Nombre del filtro (asigna un nombre claro)
   - Condiciones (De, Para, Asunto, Incluye, No incluye, etc.)
   - Acciones (Omitir bandeja de entrada, Marcar como leído, Aplicar etiqueta, etc.)
   - Usa “Duplicar esta acción” para crear otro filtro con las mismas acciones
3. Usa “+ AND” para añadir varias condiciones
4. Usa “+ OR” para añadir otro grupo de condiciones
5. Los cambios se guardan automáticamente

### Cambiar la prioridad de los filtros
1. Arrastra el icono “≡≡” del filtro en la lista del panel izquierdo
2. Suéltalo en la posición deseada
3. Los cambios se guardan automáticamente

### Exportar filtros
1. Haz clic en “Guardar filtros” en el panel izquierdo
2. Se descargará un archivo XML

### Aplicar filtros en Gmail
1. Prepara el archivo XML exportado
2. Abre Gmail → Configuración (⚙) → Ver todos los ajustes
3. Selecciona la pestaña “Filtros y direcciones bloqueadas”
4. Haz clic en “Importar filtros”
5. Selecciona el archivo XML y haz clic en “Abrir archivo”
6. Selecciona los filtros a aplicar y haz clic en “Crear filtros”

### Importar filtros
1. Haz clic en “Cargar filtros” en el panel izquierdo
2. Selecciona el archivo XML
3. Elige si deseas fusionar con los existentes o reemplazarlos

## Notas
- Los filtros se guardan en el almacenamiento del navegador y pueden **sincronizarse con tu cuenta de Google**
- Los datos **no se envían a servidores externos**
- Si usas muchos filtros complejos, exporta regularmente una copia de seguridad

## Solución de problemas
- **P: No puedo importar los filtros correctamente**  
  **R:** Asegúrate de que el archivo XML tenga el formato correcto compatible con Gmail.

- **P: Mis filtros no se guardan**  
  **R:** Es posible que el almacenamiento del navegador esté lleno. Elimina datos innecesarios o exporta los filtros.

- **P: Los botones no aparecen en Gmail**  
  **R:** Recarga la página y verifica que la extensión esté habilitada.

## Comentarios y contribuciones
Informa de errores o solicita nuevas funciones en GitHub Issues o mediante el formulario de contacto.  
- GitHub Issues: https://github.com/d1tn/gmail-filter-manager/issues

# Historial de versiones
#### 2025
- **11.01 v1.3.2**
  - Cambio de almacenamiento local a sincronización con cuenta de Google (chrome.storage.sync)
  - Actualización de la descripción y los Términos de uso
- **09.15 v1.3.1**
  - Añadido soporte para español, chino simplificado, francés, alemán y ruso
- **06.05 v1.3.0**
  - Añadida función “Duplicar esta acción”
- **06.04 v1.2.2**
  - Menú movido a la esquina superior derecha
- **05.15 v1.2.0**
  - Soporte en inglés añadido
  - Corrección de errores de eliminación
  - **05.17 v1.2.1**
    - Añadido subtítulo en el nombre de la aplicación
- **05.10 v1.1.0**
  - Configuración avanzada para eliminar mensajes
  - Exportación individual de filtros añadida
  - **05.10 v1.1.1**
    - Corregido error al importar y eliminar filtros
    - Formulario de contacto actualizado
- **05.07 v1.0.0** Primera versión
