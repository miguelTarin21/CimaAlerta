import pandas as pd
import json

def procesar_datos():
    # lectura del archivo csv
    df = pd.read_csv("datos_sismicos.csv")
    df['Tiempo_UTC'] = pd.to_datetime(df['Tiempo_UTC'])

    # deteccion del pico maximo
    indice_pico = df['Amplitud'].abs().idxmax()
    fila_pico = df.loc[indice_pico]
    pico_maximo_real = float(fila_pico['Amplitud'])
    hora_pico_exacta = fila_pico['Tiempo_UTC'].strftime('%Y-%m-%dT%H:%M:%S.%fZ')

    # reduccion de datos por segundo
    df['Segundo'] = df['Tiempo_UTC'].dt.floor('s')
    df_downsampled = df.groupby('Segundo')['Amplitud'].max().reset_index()

    # formato de fecha iso 8601
    df_downsampled['Tiempo_UTC'] = df_downsampled['Segundo'].dt.strftime('%Y-%m-%dT%H:%M:%SZ')
    df_downsampled = df_downsampled.drop(columns=['Segundo'])

    print(f"Pico maximo detectado: {pico_maximo_real} a las {hora_pico_exacta}")

    # exportacion a json
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

    print("Archivo datos_sismicos_web.json generado")

if __name__ == '__main__':
    procesar_datos()
