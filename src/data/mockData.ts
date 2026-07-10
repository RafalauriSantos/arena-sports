import { TimeSlot, Booking } from "@/types/booking";

const today = new Date();

const pad2 = (value: number) => String(value).padStart(2, "0");

const formatDate = (date: Date): string => {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

// Generate time slots for the entire month
const generateTimeSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  let slotId = 1;

  // Generate for 30 days starting from today
  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    // Create a fresh date for each day to avoid mutation issues
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + dayOffset);
    const dateStr = formatDate(date);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    // Removed console.log for production performance

    // Define working hours based on day of week
    let startHour: number;
    let endHour: number;

    if (dayOfWeek === 0) {
      // Domingo: 8h às 12h
      startHour = 8;
      endHour = 12;
    } else {
      // Segunda a Sábado: 9h às 22h
      startHour = 9;
      endHour = 22;
    }

    // Generate slots for both fields
    const fields: Array<{ id: "principal" | "medio" }> = [
      { id: "principal" },
      { id: "medio" }
    ];

    fields.forEach(field => {
      for (let hour = startHour; hour <= endHour; hour++) {
        const timeStr = `${hour.toString().padStart(2, '0')}:00`;

        slots.push({
          id: slotId.toString(),
          time: timeStr,
          status: "available",
          date: dateStr,
          fieldId: field.id,
          pricePerPlayer: 0,
        });

        slotId++;
      }
    });
  }

  return slots;
};

export const initialTimeSlots: TimeSlot[] = generateTimeSlots();

const todayStr = formatDate(today);
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = formatDate(tomorrow);

export const initialBookings: Booking[] = [];
