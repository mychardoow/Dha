import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

interface SystemHealth {
  cpu: number;
  memory: number;
  network: number;
  storage: number;
  timestamp: string;
}

interface SecurityEvent {
  id: string;
  eventType: string;
  severity: string;
  details: any;
  createdAt: string;
  ipAddress?: string;
}

interface RegionalStatus {
  region: string;
  nodes: number;
  threatLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "online" | "warning" | "offline";
}

export default function MonitoringDashboard() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [activityFeed, setActivityFeed] = useState<SecurityEvent[]>([]);

  const { socket } = useWebSocket();

  // Get system health
  const { data: healthData } = useQuery({
    queryKey: ["/api/monitoring/health"],
    queryFn: () => api.get<SystemHealth>("/api/monitoring/health"),
    refetchInterval: 15000
  });

  // Get security events
  const { data: securityEvents = [] } = useQuery({
    queryKey: ["/api/security/events"],
    queryFn: () => api.get<SecurityEvent[]>("/api/security/events?limit=20"),
    refetchInterval: 30000
  });

  // Get regional status
  const { data: regionalStatus = [] } = useQuery({
    queryKey: ["/api/monitoring/regional"],
    queryFn: () => api.get<RegionalStatus[]>("/api/monitoring/regional"),
    refetchInterval: 60000
  });

  // Listen for real-time updates
  useEffect(() => {
    if (socket) {
      socket.on("system:health", (health: SystemHealth) => {
        setSystemHealth(health);
      });

      socket.on("security:event", (event: SecurityEvent) => {
        setActivityFeed(prev => [event, ...prev.slice(0, 19)]);
      });

      return () => {
        socket.off("system:health");
        socket.off("security:event");
      };
    }
  }, [socket]);

  useEffect(() => {
    if (healthData) {
      setSystemHealth(healthData);
    }
  }, [healthData]);

  useEffect(() => {
    if (securityEvents.length > 0) {
      setActivityFeed(securityEvents);
    }
  }, [securityEvents]);

  const getStatusColor = (value: number) => {
    if (value >= 90) return "text-alert";
    if (value >= 70) return "text-warning";
    return "text-secure";
  };

  const getEventIcon = (eventType: string) => {
    if (eventType.includes("biometric")) return "👁️";
    if (eventType.includes("document")) return "📄";
    if (eventType.includes("quantum")) return "⚛️";
    if (eventType.includes("fraud")) return "🚨";
    if (eventType.includes("login")) return "🔐";
    return "🔍";
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "high":
        return <Badge className="security-level-3">HIGH</Badge>;
      case "medium":
        return <Badge className="security-level-2">MEDIUM</Badge>;
      default:
        return <Badge className="security-level-1">LOW</Badge>;
    }
  };

  const getThreatLevelBadge = (level: string) => {
    switch (level) {
      case "CRITICAL":
        return <Badge className="security-level-3">CRITICAL</Badge>;
      case "HIGH":
        return <Badge className="security-level-3">HIGH</Badge>;
      case "MEDIUM":
        return <Badge className="security-level-2">MEDIUM</Badge>;
      default:
        return <Badge className="security-level-1">LOW</Badge>;
    }
  };

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case "online":
        return <span className="status-indicator status-online"></span>;
      case "warning":
        return <span className="status-indicator status-warning"></span>;
      default:
        return <span className="status-indicator status-alert"></span>;
    }
  };

  // System health chart data
  const healthChartData = systemHealth ? {
    labels: ['CPU', 'Memory', 'Network', 'Storage'],
    datasets: [{
      data: [systemHealth.cpu, systemHealth.memory, systemHealth.network, systemHealth.storage],
      backgroundColor: [
        'rgb(16, 185, 129)',
        'rgb(59, 130, 246)',
        'rgb(245, 158, 11)',
        'rgb(139, 92, 246)'
      ],
      borderWidth: 0
    }]
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: 'rgb(156, 163, 175)',
          padding: 20
        }
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* System Health Overview */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="glass border-glass-border" data-testid="card-system-health">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>💓</span>
              <span>System Health Monitor</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Real-time Metrics Chart */}
            <div className="chart-container mb-6" style={{ height: '300px' }}>
              {healthChartData ? (
                <Doughnut data={healthChartData} options={chartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="loading-spinner w-8 h-8" />
                </div>
              )}
            </div>

            {/* System Status Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-secure/20 p-4 rounded-lg text-center" data-testid="metric-cpu">
                <div className="flex items-center justify-center mb-2">
                  <span className="status-indicator status-online mr-2"></span>
                  <span className="text-sm font-medium">CPU</span>
                </div>
                <div className={`text-lg font-bold ${getStatusColor(systemHealth?.cpu || 0)}`}>
                  {systemHealth?.cpu || 0}%
                </div>
              </div>

              <div className="bg-primary/20 p-4 rounded-lg text-center" data-testid="metric-memory">
                <div className="flex items-center justify-center mb-2">
                  <span className="status-indicator status-online mr-2"></span>
                  <span className="text-sm font-medium">Memory</span>
                </div>
                <div className={`text-lg font-bold ${getStatusColor(systemHealth?.memory || 0)}`}>
                  {systemHealth?.memory || 0}%
                </div>
              </div>

              <div className="bg-warning/20 p-4 rounded-lg text-center" data-testid="metric-network">
                <div className="flex items-center justify-center mb-2">
                  <span className={`status-indicator ${(systemHealth?.network || 0) > 80 ? 'status-warning' : 'status-online'} mr-2`}></span>
                  <span className="text-sm font-medium">Network</span>
                </div>
                <div className={`text-lg font-bold ${getStatusColor(systemHealth?.network || 0)}`}>
                  {systemHealth?.network || 0}%
                </div>
              </div>

              <div className="bg-quantum/20 p-4 rounded-lg text-center" data-testid="metric-storage">
                <div className="flex items-center justify-center mb-2">
                  <span className="status-indicator status-online mr-2"></span>
                  <span className="text-sm font-medium">Storage</span>
                </div>
                <div className={`text-lg font-bold ${getStatusColor(systemHealth?.storage || 0)}`}>
                  {systemHealth?.storage || 0}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Network Security Map */}
        <Card className="glass border-glass-border" data-testid="card-regional-status">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>🌍</span>
              <span>Global Security Network</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {(Array.isArray(regionalStatus) ? regionalStatus : []).map(
                  (region) => (
                  <div
                    key={region.region}
                    className={`border rounded-lg p-4 ${
                      region.threatLevel === "CRITICAL" ? "border-alert bg-alert/10" :
                      region.threatLevel === "HIGH" ? "border-alert bg-alert/10" :
                      region.threatLevel === "MEDIUM" ? "border-warning bg-warning/10" :
                      "border-secure bg-secure/10"
                    }`}
                    data-testid={`region-${region.region.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium">{region.region}</span>
                      {getStatusIndicator(region.status)}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Nodes Active:</span>
                        <span>{region.nodes}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Threat Level:</span>
                        {getThreatLevelBadge(region.threatLevel)}
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Activity Feed */}
      <Card className="glass border-glass-border" data-testid="card-activity-feed">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>📡</span>
            <span>Live Activity Feed</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto" data-testid="activity-feed">
            {activityFeed.length > 0 ? (
              activityFeed.map((activity, index) => (
                <div
                  key={activity.id || index}
                  className={`border-l-4 p-3 rounded ${
                    activity.severity === "high" ? "border-alert bg-alert/10" :
                    activity.severity === "medium" ? "border-warning bg-warning/10" :
                    "border-secure bg-secure/10"
                  }`}
                  data-testid={`activity-${index}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-2">
                      <span className="text-sm mt-0.5">
                        {getEventIcon(activity.eventType)}
                      </span>
                      <div>
                        <div className="text-sm font-medium">
                          {activity.eventType.replace(/_/g, ' ')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {activity.details?.location && `${activity.details.location} | `}
                          {activity.ipAddress && `IP: ${activity.ipAddress}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      {getSeverityBadge(activity.severity)}
                      <span className="text-xs text-muted-foreground">
                        {new Date(activity.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <span className="text-4xl block mb-4">📡</span>
                <p>No recent activity</p>
                <p className="text-sm mt-2">System monitoring active</p>
              </div>
            )}
          </div>

          {/* System Controls */}
          <div className="mt-6 space-y-3 border-t border-border pt-6">
            <h4 className="font-medium">System Controls</h4>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full border-secure text-secure hover:bg-secure/10"
                data-testid="button-security-scan"
              >
                <span>🔍</span>
                <span className="ml-2">Run Security Scan</span>
              </Button>
              <Button
                variant="outline"
                className="w-full border-warning text-warning hover:bg-warning/10"
                data-testid="button-system-lockdown"
              >
                <span>🔒</span>
                <span className="ml-2">Emergency Lockdown</span>
              </Button>
              <Button
                variant="outline"
                className="w-full border-primary text-primary hover:bg-primary/10"
                data-testid="button-export-logs"
              >
                <span>📄</span>
                <span className="ml-2">Export System Logs</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}