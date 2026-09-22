/* ============================================================================
   PORTFOLIO — Interacciones
   Vanilla JS, sin frameworks. Módulos independientes:
     1. Tema claro/oscuro con persistencia en localStorage
        (el tema inicial y la clase .js los fija el script inline del <head>)
     2. Menú de navegación responsive
     3. Revelado de contenido al hacer scroll (IntersectionObserver)
     4. Validación del formulario de contacto
   Sin JS habilitado el sitio sigue siendo completamente usable.
   ========================================================================== */
'use strict';

/* ==========================================================================
   1. TEMA CLARO/OSCURO
   ========================================================================== */

const TEMA_CLAVE = 'tema';
const TEMA_OSCURO = 'dark';
const TEMA_CLARO = 'light';

const preferenciaClaro = window.matchMedia('(prefers-color-scheme: light)');

function escucharMq(mediaQuery, controlador) {
    if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', controlador);
    } else if (typeof mediaQuery.addListener === 'function') {
        mediaQuery.addListener(controlador);
    }
}

function temaGuardado() {
    try {
        return window.localStorage.getItem(TEMA_CLAVE);
    } catch {
        return null;
    }
}

function temaInicial() {
    const guardado = temaGuardado();
    if (guardado === TEMA_CLARO || guardado === TEMA_OSCURO) {
        return guardado;
    }
    return preferenciaClaro.matches ? TEMA_CLARO : TEMA_OSCURO;
}

/* Los valores hex de la paleta se leen de los tokens CSS del tema activo */
function actualizarPaleta() {
    document.querySelectorAll('[data-token]').forEach((elemento) => {
        const valor = getComputedStyle(document.documentElement)
            .getPropertyValue(elemento.dataset.token)
            .trim();
        if (valor) elemento.textContent = valor.toUpperCase();
    });
}

function aplicarTema(tema) {
    document.documentElement.dataset.theme = tema;
    actualizarPaleta();

    const botonTema = document.querySelector('.cambiar-tema');
    if (!botonTema) return;

    const esClaro = tema === TEMA_CLARO;
    botonTema.setAttribute('aria-pressed', esClaro ? 'true' : 'false');
    botonTema.setAttribute(
        'aria-label',
        esClaro ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro'
    );
}

function alternarTema() {
    const actual = document.documentElement.dataset.theme;
    const nuevo = actual === TEMA_CLARO ? TEMA_OSCURO : TEMA_CLARO;

    aplicarTema(nuevo);
    try {
        window.localStorage.setItem(TEMA_CLAVE, nuevo);
    } catch {
        /* Sin almacenamiento disponible: el tema se aplica solo en esta sesión */
    }
}

function seguirPreferenciaSistema(evento) {
    if (temaGuardado() === null) {
        aplicarTema(evento.matches ? TEMA_CLARO : TEMA_OSCURO);
    }
}

function inicializarTema() {
    aplicarTema(temaInicial());

    const botonTema = document.querySelector('.cambiar-tema');
    if (botonTema) {
        botonTema.addEventListener('click', alternarTema);
    }

    escucharMq(preferenciaClaro, seguirPreferenciaSistema);
}

/* ==========================================================================
   2. MENÚ DE NAVEGACIÓN RESPONSIVE
   ========================================================================== */

const escritorioMq = window.matchMedia('(min-width: 62rem)');

function inicializarMenu() {
    const cabecera = document.querySelector('.cabecera');
    const navegacion = cabecera?.querySelector('.navegacion');
    const botonMenu = cabecera?.querySelector('.menu-toggle');
    if (!cabecera || !navegacion || !botonMenu) return;

    function abrirMenu() {
        navegacion.classList.add('navegacion--abierto');
        botonMenu.setAttribute('aria-expanded', 'true');
        botonMenu.setAttribute('aria-label', 'Cerrar menú de navegación');
    }

    function cerrarMenu() {
        navegacion.classList.remove('navegacion--abierto');
        botonMenu.setAttribute('aria-expanded', 'false');
        botonMenu.setAttribute('aria-label', 'Abrir menú de navegación');
    }

    function menuAbierto() {
        return navegacion.classList.contains('navegacion--abierto');
    }

    botonMenu.addEventListener('click', () => {
        if (menuAbierto()) {
            cerrarMenu();
        } else {
            abrirMenu();
        }
    });

    navegacion.querySelectorAll('a').forEach((enlace) => {
        enlace.addEventListener('click', cerrarMenu);
    });

    document.addEventListener('keydown', (evento) => {
        if (evento.key === 'Escape' && menuAbierto()) {
            cerrarMenu();
            botonMenu.focus();
        }
    });

    document.addEventListener('click', (evento) => {
        if (menuAbierto() && !cabecera.contains(evento.target)) {
            cerrarMenu();
        }
    });

    escucharMq(escritorioMq, (evento) => {
        if (evento.matches) cerrarMenu();
    });
}

/* ==========================================================================
   3. REVELADO DE CONTENIDO AL HACER SCROLL
   ========================================================================== */

const SELECTORES_REVEAL = [
    '.seccion:not(.seccion--inicio)',
    '.proyecto',
    '.componente-grupo',
    '.paleta__color',
    '.muestra-tipografia'
].join(', ');

function inicializarReveal() {
    const movimientoReducido = window.matchMedia('(prefers-reduced-motion: reduce)');
    const hayObservador = 'IntersectionObserver' in window;

    if (movimientoReducido.matches || !hayObservador) return;

    const objetivos = document.querySelectorAll(SELECTORES_REVEAL);
    if (objetivos.length === 0) return;

    const observador = new IntersectionObserver((entradas) => {
        entradas.forEach((entrada) => {
            if (!entrada.isIntersecting) return;
            entrada.target.classList.add('reveal--visible');
            observador.unobserve(entrada.target);
        });
    }, { threshold: 0, rootMargin: '0px 0px -10% 0px' });

    objetivos.forEach((objetivo) => {
        objetivo.classList.add('reveal');
        observador.observe(objetivo);
    });
}

/* ==========================================================================
   4. VALIDACIÓN DEL FORMULARIO DE CONTACTO
   ========================================================================== */

function mensajeDeError(campo) {
    const valor = campo.value.trim();
    if (campo.required && valor === '') {
        return 'Este campo es obligatorio.';
    }
    if (valor !== '' && campo.validity.typeMismatch) {
        return 'Introduce un correo válido, por ejemplo nombre@dominio.com.';
    }
    if (valor !== '' && campo.minLength > 0 && valor.length < campo.minLength) {
        return `Escribe al menos ${campo.minLength} caracteres.`;
    }
    return '';
}

function inicializarFormulario() {
    const formulario = document.querySelector('.seccion--contacto .formulario');
    if (!formulario) return;

    const campos = Array.from(formulario.querySelectorAll('input, textarea'));
    const estado = formulario.querySelector('.formulario__estado');

    // Con JS se usan mensajes propios; sin JS sigue la validación nativa del navegador
    formulario.setAttribute('novalidate', '');

    const errores = new Map();
    campos.forEach((campo) => {
        const error = document.createElement('p');
        error.className = 'formulario__error';
        error.id = `${campo.id}-error`;
        error.hidden = true;
        campo.closest('.formulario__campo').appendChild(error);
        campo.setAttribute('aria-describedby', error.id);
        errores.set(campo, error);
    });

    function validar(campo) {
        const mensaje = mensajeDeError(campo);
        const error = errores.get(campo);
        error.textContent = mensaje;
        error.hidden = mensaje === '';
        if (mensaje) {
            campo.setAttribute('aria-invalid', 'true');
        } else {
            campo.removeAttribute('aria-invalid');
        }
        return mensaje === '';
    }

    campos.forEach((campo) => {
        campo.addEventListener('blur', () => {
            if (campo.value !== '' || campo.hasAttribute('aria-invalid')) validar(campo);
        });
        campo.addEventListener('input', () => {
            if (estado) estado.textContent = '';
            if (campo.hasAttribute('aria-invalid')) validar(campo);
        });
    });

    formulario.addEventListener('submit', (evento) => {
        evento.preventDefault();

        const invalidos = campos.filter((campo) => !validar(campo));
        if (invalidos.length > 0) {
            invalidos[0].focus();
            if (estado) estado.textContent = 'Revisa los campos marcados antes de enviar.';
            return;
        }

        formulario.reset();
        if (estado) {
            estado.textContent = 'Mensaje validado correctamente. El envío aún no está conectado a un servidor.';
        }
    });
}

/* ==========================================================================
   INICIALIZACIÓN
   ========================================================================== */

function inicializar() {
    inicializarTema();
    inicializarMenu();
    inicializarReveal();
    inicializarFormulario();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializar);
} else {
    inicializar();
}