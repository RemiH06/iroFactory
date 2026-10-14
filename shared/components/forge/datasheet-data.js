// ══════════════════════════════════════════════════════
// HOJA DE DATOS · los datos del chip de ejemplo (ATmega328P en DIP-28,
// el del Arduino Uno) y un estado compartido: los registros que se
// encienden bit por bit en la tabla mueven el diagrama de tiempos y el
// de pines (DDRB y PORTB). Cada pieza escucha `change` y `pin`.
// Fuente: hoja de datos de Microchip, ATmega48A/PA/88A/PA/168A/PA/328/P.
// ══════════════════════════════════════════════════════
export const CHIP = { name: 'ATmega328P', pkg: 'DIP-28', fosc: 16e6 };

// Grupos de función: color del tema y nombre (el nombre va siempre escrito).
export const GROUPS = [
  ['pwr', 'Alimentación', '--voltage'], ['adc', 'ADC', '--signal'], ['spi', 'SPI', '--core'], ['uart', 'UART', '--flux'],
  ['pwm', 'PWM', '--current'], ['int', 'Interrupción', '--interrupt'], ['i2c', 'I²C', '--slag'], ['sys', 'Reloj y reinicio', '--ground']
];
// [número, nombre, funciones, grupos, Arduino, nota]
export const PINS = [
  [1, 'PC6', ['RESET', 'PCINT14'], ['sys'], 'RESET', 'Activo en bajo. Con el fusible RSTDISBL se vuelve GPIO, pero ya no se puede programar por ISP.'],
  [2, 'PD0', ['RXD', 'PCINT16'], ['uart'], 'D0', 'Entrada del USART0. En el Uno va al convertidor USB.'],
  [3, 'PD1', ['TXD', 'PCINT17'], ['uart'], 'D1', 'Salida del USART0.'],
  [4, 'PD2', ['INT0', 'PCINT18'], ['int'], 'D2', 'Interrupción externa 0: flanco o nivel, configurable en EICRA.'],
  [5, 'PD3', ['INT1', 'OC2B', 'PCINT19'], ['int', 'pwm'], 'D3', 'Interrupción externa 1 y salida B del temporizador 2.'],
  [6, 'PD4', ['T0', 'XCK', 'PCINT20'], ['uart'], 'D4', 'Reloj externo del temporizador 0 o del USART en modo síncrono.'],
  [7, 'VCC', ['VCC'], ['pwr'], '5V', '1.8 a 5.5 V; a 16 MHz hacen falta 4.5 V o más. Capacitor de 100 nF lo más cerca posible.'],
  [8, 'GND', ['GND'], ['pwr'], 'GND', 'Tierra digital.'],
  [9, 'PB6', ['XTAL1', 'TOSC1', 'PCINT6'], ['sys'], '', 'Cristal externo (16 MHz en el Uno) con capacitores de 22 pF a tierra.'],
  [10, 'PB7', ['XTAL2', 'TOSC2', 'PCINT7'], ['sys'], '', 'Segunda pata del cristal.'],
  [11, 'PD5', ['OC0B', 'T1', 'PCINT21'], ['pwm'], 'D5', 'Salida B del temporizador 0 (PWM).'],
  [12, 'PD6', ['OC0A', 'AIN0', 'PCINT22'], ['pwm'], 'D6', 'Salida A del temporizador 0 y entrada positiva del comparador analógico.'],
  [13, 'PD7', ['AIN1', 'PCINT23'], [], 'D7', 'Entrada negativa del comparador analógico.'],
  [14, 'PB0', ['ICP1', 'CLKO', 'PCINT0'], ['sys'], 'D8', 'Captura de entrada del temporizador 1; con el fusible CKOUT saca el reloj.'],
  [15, 'PB1', ['OC1A', 'PCINT1'], ['pwm'], 'D9', 'Salida A del temporizador 1 (PWM de 16 bits).'],
  [16, 'PB2', ['SS', 'OC1B', 'PCINT2'], ['spi', 'pwm'], 'D10', 'Selección de esclavo. En maestro, si es entrada y baja, el SPI pasa a esclavo: déjala como salida.'],
  [17, 'PB3', ['MOSI', 'OC2A', 'PCINT3'], ['spi', 'pwm'], 'D11', 'Datos de maestro a esclavo; también ISP.'],
  [18, 'PB4', ['MISO', 'PCINT4'], ['spi'], 'D12', 'Datos de esclavo a maestro; también ISP.'],
  [19, 'PB5', ['SCK', 'PCINT5'], ['spi'], 'D13', 'Reloj del SPI. En el Uno tiene el LED integrado.'],
  [20, 'AVCC', ['AVCC'], ['pwr'], '', 'Alimenta el ADC y el puerto C. Va a VCC aunque no se use el ADC, de preferencia con filtro LC.'],
  [21, 'AREF', ['AREF'], ['pwr', 'adc'], 'AREF', 'Referencia del ADC. Con referencia interna, solo un capacitor a tierra.'],
  [22, 'GND', ['GND'], ['pwr'], 'GND', 'Tierra (analógica).'],
  [23, 'PC0', ['ADC0', 'PCINT8'], ['adc'], 'A0', 'Canal 0 del ADC de 10 bits.'],
  [24, 'PC1', ['ADC1', 'PCINT9'], ['adc'], 'A1', 'Canal 1 del ADC.'],
  [25, 'PC2', ['ADC2', 'PCINT10'], ['adc'], 'A2', 'Canal 2 del ADC.'],
  [26, 'PC3', ['ADC3', 'PCINT11'], ['adc'], 'A3', 'Canal 3 del ADC.'],
  [27, 'PC4', ['ADC4', 'SDA', 'PCINT12'], ['adc', 'i2c'], 'A4', 'Canal 4 del ADC y datos del bus I²C (TWI).'],
  [28, 'PC5', ['ADC5', 'SCL', 'PCINT13'], ['adc', 'i2c'], 'A5', 'Canal 5 del ADC y reloj del bus I²C.']
].map(([n, name, funcs, groups, ard, note]) => ({ n, name, funcs, groups, ard, note }));

// Registros: bits de 7 a 0 como [nombre, acceso, descripción]; null = reservado.
const RW = 'R/W', R = 'R';
export const REGS = [
  { name: 'SPCR', addr: 0x4C, reset: 0x00, start: 0x51, group: 'spi', desc: 'Control del SPI', bits: [
    ['SPIE', RW, 'Habilita la interrupción al terminar una transferencia.'], ['SPE', RW, 'Enciende el SPI.'],
    ['DORD', RW, '1: sale primero el bit menos significativo; 0: el más significativo.'], ['MSTR', RW, '1: maestro; 0: esclavo.'],
    ['CPOL', RW, 'Polaridad del reloj: nivel de SCK en reposo.'], ['CPHA', RW, 'Fase: 0 muestrea en el primer flanco, 1 en el segundo.'],
    ['SPR1', RW, 'Divisor del reloj, bit alto (con SPR0 y SPI2X).'], ['SPR0', RW, 'Divisor del reloj, bit bajo.']] },
  { name: 'SPSR', addr: 0x4D, reset: 0x00, start: 0x00, group: 'spi', desc: 'Estado del SPI', bits: [
    ['SPIF', R, 'Se enciende al terminar una transferencia.'], ['WCOL', R, 'Se escribió SPDR durante una transferencia.'], null, null, null, null, null,
    ['SPI2X', RW, 'Duplica la velocidad del SPI en maestro.']] },
  { name: 'UCSR0A', addr: 0xC0, reset: 0x20, start: 0x20, group: 'uart', desc: 'Estado y control A del USART0', bits: [
    ['RXC0', R, 'Hay un dato recibido sin leer.'], ['TXC0', RW, 'Terminó la transmisión (se limpia escribiendo 1).'],
    ['UDRE0', R, 'El búfer de transmisión está vacío.'], ['FE0', R, 'Error de trama: el bit de paro llegó en bajo.'],
    ['DOR0', R, 'Se perdió un dato: llegó otro antes de leer el anterior.'], ['UPE0', R, 'Error de paridad.'],
    ['U2X0', RW, 'Velocidad doble en modo asíncrono (divide entre 8 en vez de 16).'], ['MPCM0', RW, 'Modo multiprocesador.']] },
  { name: 'UCSR0B', addr: 0xC1, reset: 0x00, start: 0x18, group: 'uart', desc: 'Control B del USART0', bits: [
    ['RXCIE0', RW, 'Interrupción al recibir.'], ['TXCIE0', RW, 'Interrupción al terminar de transmitir.'], ['UDRIE0', RW, 'Interrupción con el búfer vacío.'],
    ['RXEN0', RW, 'Enciende el receptor (toma PD0).'], ['TXEN0', RW, 'Enciende el transmisor (toma PD1).'],
    ['UCSZ02', RW, 'Con UCSZ01:0 = 11, caracteres de 9 bits.'], ['RXB80', R, 'Noveno bit recibido.'], ['TXB80', RW, 'Noveno bit a transmitir.']] },
  { name: 'UCSR0C', addr: 0xC2, reset: 0x06, start: 0x06, group: 'uart', desc: 'Control C del USART0', bits: [
    ['UMSEL01', RW, 'Modo, bit alto: 00 asíncrono, 01 síncrono, 11 SPI maestro.'], ['UMSEL00', RW, 'Modo, bit bajo.'],
    ['UPM01', RW, 'Paridad: 00 ninguna, 10 par, 11 impar.'], ['UPM00', RW, 'Paridad, bit bajo.'],
    ['USBS0', RW, 'Bits de paro: 0 uno, 1 dos.'], ['UCSZ01', RW, 'Tamaño del carácter, bit 1 (11 = 8 bits).'],
    ['UCSZ00', RW, 'Tamaño del carácter, bit 0.'], ['UCPOL0', RW, 'Polaridad del reloj en modo síncrono.']] },
  { name: 'UBRR0L', addr: 0xC4, reset: 0x00, start: 103, group: 'uart', num: true, desc: 'Divisor de baudios (byte bajo)', bits: Array.from({ length: 8 }, (_, i) => [`UBRR${7 - i}`, RW, 'Baudios = fosc / (16 · (UBRR + 1)); con U2X0, entre 8.'])},
  { name: 'ADCSRA', addr: 0x7A, reset: 0x00, start: 0x87, group: 'adc', desc: 'Control y estado A del ADC', bits: [
    ['ADEN', RW, 'Enciende el ADC.'], ['ADSC', RW, 'Inicia una conversión; vuelve a 0 al terminar.'], ['ADATE', RW, 'Disparo automático (fuente en ADCSRB).'],
    ['ADIF', RW, 'Terminó una conversión (se limpia escribiendo 1).'], ['ADIE', RW, 'Interrupción al terminar.'],
    ['ADPS2', RW, 'Prescaler del reloj del ADC, bit 2.'], ['ADPS1', RW, 'Prescaler, bit 1.'], ['ADPS0', RW, 'Prescaler, bit 0.']] },
  { name: 'TCCR0A', addr: 0x44, reset: 0x00, start: 0x83, group: 'pwm', desc: 'Control A del temporizador 0', bits: [
    ['COM0A1', RW, 'Qué hace OC0A al coincidir, bit alto.'], ['COM0A0', RW, 'Qué hace OC0A al coincidir, bit bajo.'],
    ['COM0B1', RW, 'Qué hace OC0B al coincidir, bit alto.'], ['COM0B0', RW, 'Qué hace OC0B al coincidir, bit bajo.'], null, null,
    ['WGM01', RW, 'Modo de onda, bit 1 (con WGM02 en TCCR0B).'], ['WGM00', RW, 'Modo de onda, bit 0.']] },
  { name: 'DDRB', addr: 0x24, reset: 0x00, start: 0x2C, group: 'port', desc: 'Dirección del puerto B (1 = salida)', bits: Array.from({ length: 8 }, (_, i) => [`DDB${7 - i}`, RW, `PB${7 - i}: 1 salida, 0 entrada.`]) },
  { name: 'PORTB', addr: 0x25, reset: 0x00, start: 0x04, group: 'port', desc: 'Datos del puerto B (salida en alto, o pull-up si es entrada)', bits: Array.from({ length: 8 }, (_, i) => [`PORTB${7 - i}`, RW, `PB${7 - i}: como salida, nivel; como entrada, 1 enciende el pull-up.`]) }
];

// Estado compartido: valor actual de cada registro.
const bus = new EventTarget();
export const state = Object.fromEntries(REGS.map(r => [r.name, r.start]));
export const bit = (reg, name) => { const r = REGS.find(x => x.name === reg), i = r.bits.findIndex(b => b && b[0] === name); return (state[reg] >> (7 - i)) & 1; };
export const set = (reg, value) => { state[reg] = value & 0xFF; bus.dispatchEvent(new CustomEvent('change', { detail: { reg } })); };
export const resetAll = which => { REGS.forEach(r => { state[r.name] = which === 'reset' ? r.reset : r.start; }); bus.dispatchEvent(new CustomEvent('change', { detail: { reg: '*' } })); };
export const pinFocus = (n, source) => bus.dispatchEvent(new CustomEvent('pin', { detail: { n, source } }));
export const on = (type, fn) => bus.addEventListener(type, e => fn(e.detail));

// Lecturas derivadas, en palabras.
export const spi = () => {
  const div = [4, 16, 64, 128][bit('SPCR', 'SPR1') * 2 + bit('SPCR', 'SPR0')] / (bit('SPSR', 'SPI2X') ? 2 : 1);
  return { on: bit('SPCR', 'SPE'), master: bit('SPCR', 'MSTR'), lsb: bit('SPCR', 'DORD'), cpol: bit('SPCR', 'CPOL'), cpha: bit('SPCR', 'CPHA'), div, hz: CHIP.fosc / div };
};
export const uart = () => {
  const size = bit('UCSR0B', 'UCSZ02') && bit('UCSR0C', 'UCSZ01') && bit('UCSR0C', 'UCSZ00') ? 9 : 5 + bit('UCSR0C', 'UCSZ01') * 2 + bit('UCSR0C', 'UCSZ00');
  const upm = bit('UCSR0C', 'UPM01') * 2 + bit('UCSR0C', 'UPM00'), parity = ['none', 'reserved', 'even', 'odd'][upm];
  const mode = bit('UCSR0C', 'UMSEL01') * 2 + bit('UCSR0C', 'UMSEL00');
  const baud = CHIP.fosc / ((bit('UCSR0A', 'U2X0') ? 8 : 16) * (state.UBRR0L + 1));
  return { size, parity, stop: bit('UCSR0C', 'USBS0') ? 2 : 1, baud, mode, tx: bit('UCSR0B', 'TXEN0'), rx: bit('UCSR0B', 'RXEN0') };
};
export const hz = v => v >= 1e6 ? `${+(v / 1e6).toFixed(3)} MHz` : v >= 1e3 ? `${+(v / 1e3).toFixed(2)} kHz` : `${+v.toFixed(1)} Hz`;
