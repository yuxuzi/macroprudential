

library(shiny)

require('xlsx')
require(plotly)



source(file="./chiplot.R")


# Define server logic required to draw a histogram





shinyServer(function(input, output) {
  
   
   
   GetData<-reactive({
     
 
       if(is.null(input$File))return(NULL)
       
      
        dat=read.xlsx( input$File$datapath,1)
        dat=data.frame ( Date=as.Date(dat[,1]),dat[-1])

     
        dat
   
     
   })
  
  output$offset<-renderText({
    dat<-GetData()
    text="Start from"
    if(!is.null(dat) ){
      dt=dat[input$start,"Date"]
      
      text=paste(text,  format(dt,"%b%d,%Y"))
    }
    
    text
   
    
  })
    
    
  
    
    

  
   dataInput<-reactive({
     dat<-GetData()
     if(is.null(dat)|is.null(input$columns))return(NULL)
     if(length(input$columns)!=2|nrow(dat)<1) return(NULL)
   
     dat=subset(dat,  select=-Date)
     
     dates=GetData()["Date"]
     
   
     offset=which.min(abs( as.numeric(dates[,1]-input$roller)))-1
   

     dat=dat[offset+ (1: min(input$window,nrow(dat))), input$columns]
     
     
   })
  

 
   
   
   
   
   
  output$selectUI <- renderUI({ 
    if(is.null(input$File))return(NULL)
    checkboxGroupInput("columns", 
                       label = "Select two entries", 
                       choices = colnames(GetData()[-1]),
                       selected = 1)                                                               
  })
  

   output$sliderUI <- renderUI({ 
     dates=GetData()["Date"]
     if(is.null(dates))return(NULL)
     sliderInput("roller", label = "Roll up dates",
                  #min = input$start, max =nrow(dates)-input$window, step = input$step, value=input$start )#pre=dates[input$roller,]
                  min=dates[input$start,], max=dates[nrow(dates)-input$window,], 
                  step=input$step*as.numeric(dates[2,]-dates[1,]),
                  value=dates[input$start,],  timeFormat ="%b%d,%Y")
                  
     
   
                                                   
   }) 
   
   

   output$Plot <- renderPlot({

     dat=dataInput()
 
     
     if(!is.null(dat))
       if(nrow(dat)>0) {
         plot_chi(dat,input$type, as.numeric(input$confidences) ,nquantile=input$n_quantile)
         
       } 
    

     
     
   })
   
   output$trendPlot <- renderPlotly( {
     
     dat<-GetData()
     if(is.null(dat)|is.null(input$columns))return(NULL)
     if(length(input$columns)!=2|nrow(dat)<1) return(NULL)
     
     
     Date<-dat[seq(input$start,nrow(dat),by=input$step),"Date"]
     Measure<-rollapply(dat[input$start:nrow(dat),],input$window, by=input$step, by.column=FALSE,
                   FUN=function(df){
                     get_chi(df,input$type,input$percent)
                     
                   })
     
     p<-plot_ly(x =Date, y =Measure ,  text="input$type")
    
     layout(p, title = paste(ifelse(input$type=="chi", "Chi", "Chi Bar"), "plot vs time") )                    
           
           
     
     
     
     
   })
   
})