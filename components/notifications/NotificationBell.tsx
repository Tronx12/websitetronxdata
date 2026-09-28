"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
} from "lucide-react";
import { api } from "@/lib/api";

interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  entityId?: string;
  entityType?: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<
    NotificationItem[]
  >([]);

  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadNotifications = async () => {
    try {
      const data = await api<any>("getNotifications");

      setNotifications(data?.notifications || []);
      setUnreadCount(Number(data?.unreadCount || 0));
    } catch (error) {
      console.error("Notification loading failed:", error);
    }
  };

  useEffect(() => {
    loadNotifications();

    const interval = setInterval(() => {
      loadNotifications();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const markRead = async (id: string) => {
    try {
      await api("markNotificationRead", {
        id,
      });

      setNotifications((previous) =>
        previous.map((item) =>
          item._id === id
            ? {
                ...item,
                read: true,
              }
            : item
        )
      );

      setUnreadCount((previous) =>
        Math.max(0, previous - 1)
      );
    } catch (error) {
      console.error(error);
    }
  };

  const markAllRead = async () => {
    try {
      setLoading(true);

      await api("markAllNotificationsRead");

      setNotifications((previous) =>
        previous.map((item) => ({
          ...item,
          read: true,
        }))
      );

      setUnreadCount(0);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    if (
      type === "oe_approved" ||
      type === "survey_approved"
    ) {
      return (
        <CheckCircle2
          size={18}
          className="text-green-600"
        />
      );
    }

    if (
      type === "oe_rejected" ||
      type === "survey_rejected"
    ) {
      return (
        <XCircle
          size={18}
          className="text-red-600"
        />
      );
    }

    return (
      <AlertCircle
        size={18}
        className="text-blue-600"
      />
    );
  };

  const formatDate = (date: string) => {
    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
      return "";
    }

    return d.toLocaleString();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        className="relative rounded-lg p-2 hover:bg-slate-100"
      >
        <Bell size={21} />

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[360px] max-w-[90vw] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <h3 className="font-bold text-slate-800">
                Notifications
              </h3>

              {unreadCount > 0 && (
                <p className="text-xs text-slate-500">
                  {unreadCount} unread
                </p>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                disabled={loading}
                onClick={markAllRead}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[430px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-500">
                <Bell
                  size={30}
                  className="mx-auto mb-2 opacity-30"
                />
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  type="button"
                  key={notification._id}
                  onClick={() => {
                    if (!notification.read) {
                      markRead(notification._id);
                    }
                  }}
                  className={`flex w-full gap-3 border-b p-4 text-left transition hover:bg-slate-50 ${
                    !notification.read
                      ? "bg-blue-50/60"
                      : "bg-white"
                  }`}
                >
                  <div className="mt-0.5">
                    {getIcon(notification.type)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800">
                        {notification.title}
                      </p>

                      {!notification.read && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                      )}
                    </div>

                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      {notification.message}
                    </p>

                    <p className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
                      <Clock size={11} />
                      {formatDate(notification.createdAt)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}