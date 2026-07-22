from pathlib import Path

path = Path(r"D:\Code\Okinawa\src\components\PlannerBoard.tsx")
text = path.read_text(encoding="utf-8")

start = text.index("        <div className={styles.dayStrip}>")
end = text.index("        {highlightedPlace && (")

replacement = r'''        <div className={styles.dayTabs}>
          {itinerary.map((day) => (
            <button
              key={day.day}
              type="button"
              className={`${styles.dayTab} ${selectedDay === day.day ? styles.dayTabOn : ''}`}
              style={
                {
                  '--day-color': DAY_COLORS[(day.day - 1) % DAY_COLORS.length],
                } as CSSProperties
              }
              onClick={() => onSelectDay(day.day)}
            >
              <span>Day {day.day}</span>
              <small>{day.title}</small>
              <em>{day.items.length} 站</em>
              {itinerary.length > MIN_DAYS && (
                <span
                  className={styles.dayTabRemove}
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation()
                    removeDay(day.day)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.stopPropagation()
                      removeDay(day.day)
                    }
                  }}
                >
                  ✕
                </span>
              )}
            </button>
          ))}
          {itinerary.length < MAX_DAYS && (
            <button type="button" className={styles.addDayTab} onClick={addDay}>
              ＋
            </button>
          )}
        </div>

        {activeDay && activeDayIndex >= 0 && (
          <DayCalendar
            day={activeDay.day}
            title={activeDay.title}
            notes={activeDay.notes}
            items={activeDay.items}
            getPlace={getPlace}
            lockedIds={lockedSet}
            onTitleChange={(title) => updateTitle(activeDayIndex, title)}
            onNotesChange={(notes) => updateNotes(activeDayIndex, notes)}
            onDropPlace={dropPlaceOnCalendar}
            onMoveItem={moveCalendarItem}
            onResizeItem={resizeCalendarItem}
            onRemoveItem={(itemIndex) => {
              const item = activeDay.items[itemIndex]
              const p = item ? getPlace(item.placeId) : undefined
              if (
                item &&
                lockedSet.has(item.placeId) &&
                !confirm(
                  `${p?.name ?? '此景點'} 已鎖定必去，確定從這天移除？（鎖定清單仍保留）`
                )
              ) {
                return
              }
              removeItem(activeDayIndex, itemIndex)
            }}
            onSelectPlace={(id) => {
              const p = getPlace(id)
              if (p) {
                focusOnPlace(p)
                revealPlaceCard(id)
              }
            }}
          />
        )}

        '''

path.write_text(text[:start] + replacement + text[end:], encoding="utf-8")
print("replaced", end - start, "chars")
