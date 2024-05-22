"use client"

import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { gapi } from 'gapi-script';
import { BrowserRouter as Router } from 'react-router-dom'; // Import Router
import logo from '../images/logo.png'
import { Box, Button, Text, Image, VStack, HStack, Textarea, useToast } from '@chakra-ui/react';
import { Banner } from './components/Banner'; // Import Banner component

// Set the locale for moment to Japanese
moment.locale('ja');

const localizer = momentLocalizer(moment);

export default function Scheduler() {
  
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<{ date: string, times: string[] }[]>([]);
  const [date, setDate] = useState(new Date());
  const [userName, setUserName] = useState<string | null>(null);

  interface Event {
    id: string;
    title: string;
    start: Date;
    end: Date;
  }

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await gapi.client.calendar.events.list({
          'calendarId': 'primary',
          'timeMin': (new Date()).toISOString(), // Changed to fetch events from the current time
          'showDeleted': false,
          'singleEvents': true,
          'maxResults': 10,
          'orderBy': 'startTime'
        });
        const fetchedEvents: Event[] = response.result.items.map((item: any) => ({
          id: item.id,
          title: item.summary,
          start: new Date(item.start.dateTime),
          end: new Date(item.end.dateTime)
        }));
        setEvents(fetchedEvents);
      } catch (error) {
        console.error("Error fetching events", error);
      }
    };

    const initClient = () => {
      gapi.client.init({
        apiKey: process.env.NEXT_PUBLIC_API_KEY,
        clientId: process.env.NEXT_PUBLIC_CLIENT_ID,
        discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"],
        scope: 'https://www.googleapis.com/auth/calendar.events',
        redirectUri: 'http://localhost:3000' 
      }).then(() => {
        gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
        updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
      });
    };

    const updateSigninStatus = (isSignedIn: boolean) => {
      if (isSignedIn) {
        const currentUser = gapi.auth2.getAuthInstance().currentUser.get();
        const profile = currentUser.getBasicProfile();
        setUserName(profile ? profile.getName() : null);
        fetchEvents(); // Ensure fetchEvents is called after successful sign-in
      } else {
        setUserName(null);
        setEvents([]); // Clear events on sign-out
      }
    };

    gapi.load('client:auth2', initClient);
  }, []); // Removed navigate from the dependency array

  const handleLogin = () => {
    gapi.auth2.getAuthInstance().signIn();
  };

  const handleLogout = () => {
    gapi.auth2.getAuthInstance().signOut();
    setUserName(null);
    setEvents([]);
    setSelectedEvents([]);
  };

  const formatDate = (date: Date) => {
    // Format the date to Japanese format with day of the week in Kanji, without the year
    return moment(date).format('M月D日[(]ddd[)]').replace(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/g, match => {
      const map: { [key: string]: string } = { 'Mon': '月', 'Tue': '火', 'Wed': '水', 'Thu': '木', 'Fri': '金', 'Sat': '土', 'Sun': '日' };
      return map[match];
    });
  };

  const formatTime = (date: Date) => {
    return moment(date).format('HH:mm');
  };

  const handleSelectEvent = (event: Event) => {
    const date = formatDate(event.start);
    const time = `${formatTime(event.start)}-${formatTime(event.end)}`;
    updateSelectedEvents(date, time);
  };

  const handleSelectSlot = ({ start, end }: { start: Date, end: Date }) => {
    const date = formatDate(start);
    const time = `${formatTime(start)}-${formatTime(end)}`;
    updateSelectedEvents(date, time);
  };

  const updateSelectedEvents = (date: string, time: string) => {
    const existingDate = selectedEvents.find(event => event.date === date);
    if (existingDate) {
      existingDate.times.push(time);
      setSelectedEvents([...selectedEvents]);
    } else {
      setSelectedEvents([...selectedEvents, { date, times: [time] }]);
    }
  };

  const clearSelectedEvents = () => {
    setSelectedEvents([]);
  };


  const copyToClipboard = () => {
    const formattedText = selectedEvents.map(event => `${event.date} ${event.times.join(', ')}`).join('\n');
    navigator.clipboard.writeText(formattedText);
  };

  const eventStyleGetter = (event: Event, start: Date, end: Date, isSelected: boolean) => {
    let backgroundColor = '#3174ad'; // Default blue color for events
    const selected = selectedEvents.some(selectedEvent => 
      selectedEvent.date === formatDate(start) && selectedEvent.times.includes(`${formatTime(start)}-${formatTime(end)}`)
    );
    if (selected) {
      backgroundColor = '#D3D3D3'; // Grey out selected events
    }
    let style = {
      backgroundColor: backgroundColor,
      borderRadius: '0px',
      opacity: 0.8,
      color: 'white',
      border: '0px',
      display: 'block'
    };
    return {
      style: style
    };
  };

  return (
    <Router>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', margin: '5px 20px'  }}>
        <header style={{ backgroundColor: '#f0f0f0', padding: '10px 20px', fontSize: '24px', textAlign: 'center', color: '#333', display: 'flex', alignItems: 'center' }}>
          <img src={logo.src} alt="Logo" style={{ marginRight: '10px', height: '50px', objectFit: 'cover', width: '80px' }} /><span style={{ color: 'black', fontFamily: 'serif' }}>日程げろりん</span>
        </header>
        <div style={{ flex: '1 0 auto', overflowY: 'auto', padding: '10px' }}>
          <h1 style={{ textAlign: 'left', margin: '5px', fontSize: '22px', color: '#333' }}>{userName ? `こんにちは！${userName}さん` : 'こんにちは！ゲストさん！'}</h1>
          <button onClick={handleLogin} disabled={userName !== null} style={{ margin: '0px', padding: '5px 25.5px', fontSize: '14px', backgroundColor: 'white', color: 'black', border: '1px solid grey', borderRadius: '5px', cursor: 'pointer' }}>Login</button>
          <button onClick={handleLogout} disabled={userName === null} style={{ margin: '10px', padding: '5px 25.5px', fontSize: '14px', backgroundColor: 'white', color: 'black', border: '1px solid grey', borderRadius: '5px', cursor: 'pointer' }}>Logout</button>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            selectable
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            views={['week']}
            defaultView='week'
            timeslots={2}
            step={30}
            showMultiDayTimes
            min={new Date(0, 0, 0, 7, 0)} 
            max={new Date(0, 0, 0, 23, 0)} 
            eventPropGetter={eventStyleGetter}
            date={date}
            onNavigate={setDate}
            formats={{
              dayRangeHeaderFormat: (range) => `${moment(range.start).format('M月D日')}~${moment(range.end).format('M月D日')}`
            }}
            style={{height: '550px', width: '100%', fontSize: '14px' }} // Reduced font size
          />
        </div>
        <div style={{ flex: '1 0 auto', overflowY: 'auto', padding: '10px'}}>
        <textarea value={selectedEvents.map(event => `${event.date} ${event.times.join(', ')}`).join('\n')} readOnly style={{ width: '100%', height: '150px', marginTop: '0px', padding: '0px' }} />
        <button onClick={clearSelectedEvents} style={{ marginRight: '10px'}} >Delete</button>
        <button onClick={copyToClipboard}>Copy Schedule</button>
        </div>
        <Banner /> {/* Inserted Banner at the bottom of the page */}
      </div>
    </Router>
  );
}
