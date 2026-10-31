import pandas as pd
import json

# ==============================================================================
# Script de Procesamiento Sísmico (Meta 9 - UABC)
# Downsampling, estandarización ISO 8601 y detección del pico crítico de alerta
# ==============================================================================

def procesar_datos():
    # 1. Se lee el archivo csv crudo
    print("Leyendo datos_sismicos.csv...")
    df = pd.read_csv("datos_sismicos.csv")

    # 2. Convierte la columna de tiempo a formato de fecha y hora
    df['Tiempo_UTC'] = pd.to_datetime(df['Tiempo_UTC'])

    # 3. Calcula la métrica crítica en el DataFrame original
    indice_pico = df['Amplitud'].abs().idxmax() # Fila con la amplitud absoluta más grande
    fila_pico = df.loc[indice_pico]

    # Mantenemos el valor original (puede ser negativo) y su hora exacta
    pico_maximo_real = float(fila_pico['Amplitud'])
    hora_pico_exacta = fila_pico['Tiempo_UTC'].strftime('%Y-%m-%dT%H:%M:%S.%fZ')

    # 4. Reduce los datos (downsampling): agrupa por segundo conservando el pico máximo
    df['Segundo'] = df['Tiempo_UTC'].dt.floor('s')
    df_downsampled = df.groupby('Segundo')['Amplitud'].max().reset_index()

    # 5. Estandariza las fechas a formato web ISO 8601
    df_downsampled['Tiempo_UTC'] = df_downsampled['Segundo'].dt.strftime('%Y-%m-%dT%H:%M:%SZ')
    df_downsampled = df_downsampled.drop(columns=['Segundo'])

    print(f"Alerta sísmica detectada -> pico máximo: {pico_maximo_real} a las {hora_pico_exacta}")

    # 6. Generación de respuesta JSON estructurada para el Dashboard Web
    datos_json = {
        "estacion": "CI.BAR.BHZ",
        "pico_alerta": {
            "amplitud_maxima": pico_maximo_real,
            "marca_tiempo": hora_pico_exacta
        },
        "registros": df_downsampled.to_dict(orient='records')
    }

    with open('datos_sismicos_web.json', 'w', encoding='utf-8') as f:
        json.dump(datos_json, f, indent=4)

    print("Archivo datos_sismicos_web.json creado con éxito.")

if __name__ == '__main__':
    procesar_datos()

