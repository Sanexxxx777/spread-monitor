"""Иконка Spread Monitor — премиальный gamma-вид: золотой градиент, глянец,
рим-подсветка, глубина у глифа «спред» (два уровня цены + двусторонняя стрелка).

Запуск: QT_QPA_PLATFORM=offscreen python3 assets/make_icon.py
Затем:  npx tauri icon assets/icon-src.png
"""
import os
import sys

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

from PySide6.QtCore import QPointF, QRectF, Qt
from PySide6.QtGui import (QBrush, QColor, QImage, QLinearGradient, QPainter,
                           QPainterPath, QPen, QPolygonF, QRadialGradient)
from PySide6.QtWidgets import QApplication

S = 1024
GLYPH = QColor("#2A1D11")


def draw(path_out: str) -> None:
    img = QImage(S, S, QImage.Format.Format_ARGB32)
    img.fill(Qt.GlobalColor.transparent)
    p = QPainter(img)
    p.setRenderHint(QPainter.RenderHint.Antialiasing)

    m = S * 0.07
    rect = QRectF(m, m, S - 2 * m, S - 2 * m)
    radius = S * 0.225
    body = QPainterPath()
    body.addRoundedRect(rect, radius, radius)

    # основной золотой градиент (gamma)
    grad = QLinearGradient(rect.topLeft(), rect.bottomRight())
    grad.setColorAt(0.0, QColor("#F2C57C"))
    grad.setColorAt(0.5, QColor("#D4A574"))
    grad.setColorAt(1.0, QColor("#A66E38"))
    p.fillPath(body, QBrush(grad))

    # глянец: мягкая радиальная подсветка сверху-слева
    p.setClipPath(body)
    gloss = QRadialGradient(QPointF(rect.left() + rect.width() * 0.32,
                                    rect.top() + rect.height() * 0.20),
                            rect.width() * 0.75)
    gloss.setColorAt(0.0, QColor(255, 255, 255, 90))
    gloss.setColorAt(0.55, QColor(255, 255, 255, 0))
    p.fillRect(rect, QBrush(gloss))
    p.setClipping(False)

    # рим-подсветка по верхней кромке (стеклянный блик)
    rim = QPainterPath()
    rim.addRoundedRect(rect, radius, radius)
    p.setPen(QPen(QColor(255, 255, 255, 70), S * 0.006))
    p.drawPath(rim)

    # --- глиф «спред»: два уровня + двусторонняя стрелка ---
    x0, x1 = S * 0.31, S * 0.69
    y_top, y_bot = S * 0.37, S * 0.63
    xc = S * 0.50

    def levels_and_arrow(color: QColor, dy: float):
        pen = QPen(color)
        pen.setWidthF(S * 0.052)
        pen.setCapStyle(Qt.PenCapStyle.RoundCap)
        p.setPen(pen)
        p.drawLine(QPointF(x0, y_top + dy), QPointF(x1, y_top + dy))
        p.drawLine(QPointF(x0, y_bot + dy), QPointF(x1, y_bot + dy))
        pen.setWidthF(S * 0.040)
        p.setPen(pen)
        p.drawLine(QPointF(xc, y_top + dy + S * 0.03), QPointF(xc, y_bot + dy - S * 0.03))
        a = S * 0.05
        p.setBrush(QBrush(color))
        p.setPen(Qt.PenStyle.NoPen)
        up = QPolygonF([QPointF(xc, y_top + dy + S * 0.012),
                        QPointF(xc - a, y_top + dy + a + S * 0.012),
                        QPointF(xc + a, y_top + dy + a + S * 0.012)])
        dn = QPolygonF([QPointF(xc, y_bot + dy - S * 0.012),
                        QPointF(xc - a, y_bot + dy - a - S * 0.012),
                        QPointF(xc + a, y_bot + dy - a - S * 0.012)])
        p.drawPolygon(up)
        p.drawPolygon(dn)

    # тень глифа (глубина) — полупрозрачная, со смещением
    levels_and_arrow(QColor(60, 35, 10, 90), S * 0.012)
    # сам глиф
    levels_and_arrow(GLYPH, 0.0)

    p.end()
    img.save(path_out)
    print("saved", path_out)


if __name__ == "__main__":
    app = QApplication(sys.argv)
    draw(os.path.join(os.path.dirname(__file__), "icon-src.png"))
